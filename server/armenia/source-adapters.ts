import {
  getArmeniaSourceFeedUrl,
} from '../../src/config/armenia-source-registry';
import type {
  ArmeniaContentTransport,
  ArmeniaSourceDefinition,
  ArmeniaSourceHealthState,
} from '../../src/types/armenia-signal';

const FETCH_TIMEOUT_MS = 6_500;
const MAX_ITEMS_PER_SOURCE = 10;
const FETCH_USER_AGENT = 'armenia-signal/1.0 (+https://armenia-signal.vercel.app)';

export interface RawArmeniaArticle {
  source: ArmeniaSourceDefinition;
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
  observedAt: string;
  transport: ArmeniaContentTransport;
}

export interface ArmeniaSourceFetchResult {
  source: ArmeniaSourceDefinition;
  state: ArmeniaSourceHealthState;
  primaryTransport: ArmeniaContentTransport;
  transportUsed?: ArmeniaContentTransport;
  items: RawArmeniaArticle[];
  checkedAt: string;
  errorCode?: 'timeout' | 'http' | 'network' | 'parse' | 'empty';
}

type FetchErrorCode = NonNullable<ArmeniaSourceFetchResult['errorCode']>;

class SourceFetchError extends Error {
  constructor(public readonly code: FetchErrorCode, message: string) {
    super(message);
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const numeric = Number(code);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const numeric = Number.parseInt(code, 16);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : '';
    })
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function stripMarkup(value: string): string {
  return decodeXmlEntities(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagValue(block: string, tag: string): string {
  const escaped = tag.replace(':', '\\:');
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function atomLink(block: string): string {
  const match = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i);
  return match?.[1]?.trim() ?? '';
}

function parsePublishedAt(block: string): string | undefined {
  const raw = tagValue(block, 'pubDate')
    || tagValue(block, 'published')
    || tagValue(block, 'updated')
    || tagValue(block, 'dc:date');
  if (!raw) return undefined;
  const timestamp = Date.parse(stripMarkup(raw));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function cleanGoogleNewsTitle(title: string, sourceName: string): string {
  const suffix = ` - ${sourceName}`;
  return title.toLocaleLowerCase().endsWith(suffix.toLocaleLowerCase())
    ? title.slice(0, -suffix.length).trim()
    : title;
}

export function parseRssArticles(
  xml: string,
  source: ArmeniaSourceDefinition,
  transport: ArmeniaContentTransport,
  observedAt = new Date().toISOString(),
): RawArmeniaArticle[] {
  if (!xml.trim()) throw new SourceFetchError('parse', 'Empty XML body');

  const itemBlocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1] ?? '');
  const atomBlocks = itemBlocks.length > 0
    ? []
    : [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map((match) => match[1] ?? '');
  const blocks = (itemBlocks.length > 0 ? itemBlocks : atomBlocks).slice(0, MAX_ITEMS_PER_SOURCE);

  const items: RawArmeniaArticle[] = [];
  for (const block of blocks) {
    const rawTitle = stripMarkup(tagValue(block, 'title'));
    const rawLink = stripMarkup(tagValue(block, 'link')) || atomLink(block);
    if (!rawTitle || !rawLink) continue;

    let url: string;
    try {
      url = new URL(rawLink).href;
    } catch {
      continue;
    }

    const summaryRaw = tagValue(block, 'description')
      || tagValue(block, 'summary')
      || tagValue(block, 'content:encoded');
    const summary = stripMarkup(summaryRaw).slice(0, 700);
    const title = transport === 'google-news-site'
      ? cleanGoogleNewsTitle(rawTitle, source.name)
      : rawTitle;

    items.push({
      source,
      title: title.slice(0, 500),
      url,
      ...(summary ? { summary } : {}),
      ...(parsePublishedAt(block) ? { publishedAt: parsePublishedAt(block) } : {}),
      observedAt,
      transport,
    });
  }

  return items;
}

function googleNewsUrl(source: ArmeniaSourceDefinition): string {
  const query = encodeURIComponent(`site:${source.host} when:7d`);
  return `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
        'User-Agent': FETCH_USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new SourceFetchError('http', `HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof SourceFetchError) throw error;
    if (controller.signal.aborted) {
      throw new SourceFetchError('timeout', 'Source request timed out');
    }
    throw new SourceFetchError('network', error instanceof Error ? error.message : 'Network failure');
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaTransport(
  source: ArmeniaSourceDefinition,
  transport: ArmeniaContentTransport,
): Promise<RawArmeniaArticle[]> {
  const url = transport === 'direct-rss'
    ? getArmeniaSourceFeedUrl(source)
    : googleNewsUrl(source);
  if (!url) throw new SourceFetchError('empty', 'No direct feed configured');

  const xml = await fetchText(url);
  const items = parseRssArticles(xml, source, transport);
  if (items.length === 0) throw new SourceFetchError('empty', 'Feed returned no usable items');
  return items;
}

function primaryTransportFor(source: ArmeniaSourceDefinition): ArmeniaContentTransport {
  return source.collection.strategy === 'direct-rss'
    ? 'direct-rss'
    : 'google-news-site';
}

export async function fetchArmeniaSource(
  source: ArmeniaSourceDefinition,
): Promise<ArmeniaSourceFetchResult> {
  const checkedAt = new Date().toISOString();
  const primaryTransport = primaryTransportFor(source);
  const transports: ArmeniaContentTransport[] = primaryTransport === 'direct-rss'
    ? ['direct-rss', 'google-news-site']
    : ['google-news-site'];

  let lastError: FetchErrorCode = 'empty';

  for (let index = 0; index < transports.length; index++) {
    const transport = transports[index]!;
    try {
      const items = await fetchViaTransport(source, transport);
      return {
        source,
        state: index === 0 ? 'healthy' : 'degraded',
        primaryTransport,
        transportUsed: transport,
        items,
        checkedAt,
      };
    } catch (error) {
      lastError = error instanceof SourceFetchError ? error.code : 'network';
    }
  }

  return {
    source,
    state: 'unavailable',
    primaryTransport,
    items: [],
    checkedAt,
    errorCode: lastError,
  };
}
