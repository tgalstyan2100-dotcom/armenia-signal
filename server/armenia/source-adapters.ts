import {
  getArmeniaSourceFeedUrl,
} from '../../src/config/armenia-source-registry';
import type {
  ArmeniaContentLanguage,
  ArmeniaContentTransport,
  ArmeniaDetectedLanguage,
  ArmeniaSourceDefinition,
  ArmeniaSourceHealthState,
} from '../../src/types/armenia-signal';

const FETCH_TIMEOUT_MS = 6_500;
const MAX_ITEMS_PER_SOURCE = 10;
const FETCH_USER_AGENT = 'armenia-signal/2.0 (+https://armenia-signal.vercel.app)';

export interface RawArmeniaArticle {
  source: ArmeniaSourceDefinition;
  title: string;
  url: string;
  summary?: string;
  /** Origin publication time. Google News discovery dates never populate this. */
  publishedAt?: string;
  /** Aggregator/feed discovery time when the origin publication time is unknown. */
  discoveredAt?: string;
  observedAt: string;
  transport: ArmeniaContentTransport;
  language: ArmeniaDetectedLanguage;
  publishedAtVerified: boolean;
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
    .replace(/&nbsp;/gi, ' ')
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

function parseFeedDate(block: string): string | undefined {
  const raw = tagValue(block, 'pubDate')
    || tagValue(block, 'published')
    || tagValue(block, 'updated')
    || tagValue(block, 'dc:date');
  if (!raw) return undefined;
  const timestamp = Date.parse(stripMarkup(raw));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function cleanGoogleNewsTitle(title: string, source: ArmeniaSourceDefinition, feedSourceName?: string): string {
  const suffixes = [
    feedSourceName ?? '',
    source.name,
    source.host,
    ...(source.aliases ?? []),
  ].filter(Boolean);
  let value = title.trim();
  for (const suffix of suffixes) {
    const pattern = new RegExp(`\\s[-–—•]\\s${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    value = value.replace(pattern, '').trim();
  }
  return value;
}

export function detectArmeniaArticleLanguage(value: string): ArmeniaDetectedLanguage {
  const armenian = (value.match(/[\u0530-\u058F]/g) ?? []).length;
  const cyrillic = (value.match(/[\u0400-\u04FF]/g) ?? []).length;
  const latin = (value.match(/[A-Za-z]/g) ?? []).length;
  const present = [armenian > 2, cyrillic > 2, latin > 2].filter(Boolean).length;
  if (present > 1) return 'mixed';
  if (armenian > 2) return 'hy';
  if (cyrillic > 2) return 'ru';
  if (latin > 2) return 'en';
  return 'unknown';
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
    const feedSourceName = stripMarkup(tagValue(block, 'source'));
    const title = transport === 'google-news-site'
      ? cleanGoogleNewsTitle(rawTitle, source, feedSourceName)
      : rawTitle;
    const feedDate = parseFeedDate(block);
    const language = detectArmeniaArticleLanguage(`${title} ${summary}`);

    items.push({
      source,
      title: title.slice(0, 500),
      url,
      ...(summary && summary !== title ? { summary } : {}),
      ...(transport === 'direct-rss' && feedDate ? { publishedAt: feedDate } : {}),
      ...(transport === 'google-news-site' && feedDate ? { discoveredAt: feedDate } : {}),
      observedAt,
      transport,
      language,
      publishedAtVerified: transport === 'direct-rss' && Boolean(feedDate),
    });
  }

  return items;
}

function googleLocale(language: ArmeniaContentLanguage): { hl: string; gl: string; ceid: string } {
  if (language === 'hy') return { hl: 'hy', gl: 'AM', ceid: 'AM:hy' };
  if (language === 'ru') return { hl: 'ru', gl: 'AM', ceid: 'AM:ru' };
  return { hl: 'en', gl: 'AM', ceid: 'AM:en' };
}

function googleNewsUrl(
  source: ArmeniaSourceDefinition,
  language: ArmeniaContentLanguage,
  localizedBias = false,
): string {
  const days = source.provenance === 'official-primary' || source.provenance === 'official-data' ? 3 : 7;
  const bias = localizedBias
    ? language === 'hy' ? ' Հայաստան' : language === 'ru' ? ' Армения' : ' Armenia'
    : '';
  const query = encodeURIComponent(`site:${source.host}${bias} when:${days}d`);
  const locale = googleLocale(language);
  return `https://news.google.com/rss/search?q=${query}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
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

function mergeByUrl(primary: RawArmeniaArticle[], secondary: RawArmeniaArticle[]): RawArmeniaArticle[] {
  const seen = new Set<string>();
  const merged: RawArmeniaArticle[] = [];
  for (const item of [...primary, ...secondary]) {
    const key = `${item.url}|${item.title.toLocaleLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= MAX_ITEMS_PER_SOURCE) break;
  }
  return merged;
}

async function fetchGoogleNews(
  source: ArmeniaSourceDefinition,
  language: ArmeniaContentLanguage,
): Promise<RawArmeniaArticle[]> {
  const observedAt = new Date().toISOString();
  const xml = await fetchText(googleNewsUrl(source, language));
  let items = parseRssArticles(xml, source, 'google-news-site', observedAt);

  // Google News' locale controls UI language but does not guarantee the result
  // page language. If a source actually publishes in the selected language and
  // the first pass misses it, issue one language-biased query and prefer those
  // records. This keeps HY selection from being an English-only UI shell.
  const matchingLanguage = items.filter((item) => item.language === language || item.language === 'mixed').length;
  if (language !== 'en' && source.languages.includes(language) && matchingLanguage < 2) {
    try {
      const localizedXml = await fetchText(googleNewsUrl(source, language, true));
      const localized = parseRssArticles(localizedXml, source, 'google-news-site', observedAt)
        .filter((item) => item.language === language || item.language === 'mixed');
      items = mergeByUrl(localized, items);
    } catch {
      // The primary Google News response remains usable.
    }
  }

  if (items.length === 0) throw new SourceFetchError('empty', 'Feed returned no usable items');
  return items;
}

async function fetchViaTransport(
  source: ArmeniaSourceDefinition,
  transport: ArmeniaContentTransport,
  language: ArmeniaContentLanguage,
): Promise<RawArmeniaArticle[]> {
  if (transport === 'google-news-site') {
    return fetchGoogleNews(source, language);
  }

  const url = getArmeniaSourceFeedUrl(source);
  if (!url) throw new SourceFetchError('empty', 'No direct feed configured');
  const xml = await fetchText(url);
  const items = parseRssArticles(xml, source, transport);
  if (items.length === 0) throw new SourceFetchError('empty', 'Feed returned no usable items');
  return items;
}

function transportsFor(
  source: ArmeniaSourceDefinition,
  language: ArmeniaContentLanguage,
): ArmeniaContentTransport[] {
  // Current direct feed paths in the registry are Armenian feeds. For RU/EN,
  // prefer a locale-aware site query rather than showing Armenian headlines
  // under an English/Russian language selection.
  if (source.collection.strategy === 'direct-rss' && language === 'hy') {
    return ['direct-rss', 'google-news-site'];
  }
  return ['google-news-site'];
}

export async function fetchArmeniaSource(
  source: ArmeniaSourceDefinition,
  language: ArmeniaContentLanguage = 'hy',
): Promise<ArmeniaSourceFetchResult> {
  const checkedAt = new Date().toISOString();
  const transports = transportsFor(source, language);
  const primaryTransport = transports[0]!;
  let lastError: FetchErrorCode = 'empty';

  for (let index = 0; index < transports.length; index++) {
    const transport = transports[index]!;
    try {
      const items = await fetchViaTransport(source, transport, language);
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
