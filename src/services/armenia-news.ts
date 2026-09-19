import type {
  ArmeniaContentLanguage,
  ArmeniaContentSignal,
  ArmeniaContentSnapshot,
  ArmeniaSignalDomain,
  ArmeniaSourceHealth,
} from '@/types/armenia-signal';
import type { NewsItem } from '@/types';
import type {
  ArmeniaRankedSignal,
  ArmeniaRelevanceReason,
  ArmeniaSignalCategory,
  ArmeniaSignalScope,
} from '@/config/armenia-home';

const CLIENT_CACHE_TTL_MS = 2 * 60 * 1_000;

interface ClientCacheEntry {
  snapshot: ArmeniaContentSnapshot | null;
  cachedAt: number;
  inFlight: Promise<ArmeniaContentSnapshot> | null;
}

const caches = new Map<ArmeniaContentLanguage, ClientCacheEntry>();

function cacheFor(language: ArmeniaContentLanguage): ClientCacheEntry {
  let entry = caches.get(language);
  if (!entry) {
    entry = { snapshot: null, cachedAt: 0, inFlight: null };
    caches.set(language, entry);
  }
  return entry;
}

export interface ArmeniaContentClientSnapshot {
  generatedAt: string;
  language: ArmeniaContentLanguage;
  newsItems: NewsItem[];
  signals: ArmeniaRankedSignal[];
  rawSignals: ArmeniaContentSignal[];
  sources: ArmeniaSourceHealth[];
}

function domainToCategory(domain: ArmeniaSignalDomain): ArmeniaSignalCategory {
  switch (domain) {
    case 'infrastructure': return 'economy';
    case 'emergency': return 'society';
    case 'regional': return 'region';
    default: return domain;
  }
}

function scopeToUi(scope: ArmeniaContentSignal['scope']): ArmeniaSignalScope {
  if (scope === 'south-caucasus') return 'region';
  if (scope === 'external-impact') return 'world-impact';
  return 'armenia';
}

function reasonToUi(reason: ArmeniaContentSignal['relevanceReasons'][number]): ArmeniaRelevanceReason {
  return reason;
}

function signalDate(signal: ArmeniaContentSignal): { date: Date; missing: boolean } {
  const raw = signal.publishedAt ?? signal.discoveredAt ?? signal.observedAt;
  const parsed = new Date(raw);
  return { date: parsed, missing: !signal.publishedAtVerified };
}

function signalToNewsItem(signal: ArmeniaContentSignal): NewsItem {
  const published = signalDate(signal);
  return {
    source: signal.sourceName,
    title: signal.title,
    link: signal.url,
    pubDate: published.date,
    pubDateMissing: published.missing,
    isAlert: signal.urgency === 'critical' || signal.urgency === 'high',
    ...(signal.summary ? { snippet: signal.summary } : {}),
    importanceScore: signal.importanceScore,
    credibilityScore: Math.round(signal.confidence * 100),
  };
}

function signalToRanked(signal: ArmeniaContentSignal): ArmeniaRankedSignal {
  const item = signalToNewsItem(signal);
  const tags = [...new Set(signal.domains.map(domainToCategory))];
  return {
    item,
    category: domainToCategory(signal.primaryDomain),
    tags,
    scope: scopeToUi(signal.scope),
    reasons: signal.relevanceReasons.map(reasonToUi),
    score: signal.importanceScore,
  };
}

function isSnapshot(value: unknown): value is ArmeniaContentSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArmeniaContentSnapshot>;
  return candidate.version === 1
    && (candidate.language === 'hy' || candidate.language === 'ru' || candidate.language === 'en')
    && typeof candidate.generatedAt === 'string'
    && Array.isArray(candidate.signals)
    && Array.isArray(candidate.sources);
}

async function requestSnapshot(language: ArmeniaContentLanguage): Promise<ArmeniaContentSnapshot> {
  const response = await fetch(`/api/armenia/signals?lang=${encodeURIComponent(language)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`Armenia content API returned HTTP ${response.status}`);
  const data = await response.json() as unknown;
  if (!isSnapshot(data)) throw new Error('Armenia content API returned an invalid payload');
  return data;
}

function toClientSnapshot(snapshot: ArmeniaContentSnapshot): ArmeniaContentClientSnapshot {
  const rawSignals = [...snapshot.signals];
  return {
    generatedAt: snapshot.generatedAt,
    language: snapshot.language,
    newsItems: rawSignals.map(signalToNewsItem),
    signals: rawSignals.map(signalToRanked),
    rawSignals,
    sources: [...snapshot.sources],
  };
}

export async function fetchArmeniaContent(
  language: ArmeniaContentLanguage = 'hy',
  force = false,
): Promise<ArmeniaContentClientSnapshot> {
  const entry = cacheFor(language);
  const now = Date.now();
  if (!force && entry.snapshot && now - entry.cachedAt < CLIENT_CACHE_TTL_MS) {
    return toClientSnapshot(entry.snapshot);
  }

  if (!force && entry.inFlight) return toClientSnapshot(await entry.inFlight);

  const request = requestSnapshot(language)
    .then((snapshot) => {
      entry.snapshot = snapshot;
      entry.cachedAt = Date.now();
      return snapshot;
    })
    .finally(() => {
      if (entry.inFlight === request) entry.inFlight = null;
    });
  entry.inFlight = request;
  return toClientSnapshot(await request);
}

/** Compatibility bridge for callers that still expect NewsItem[]. */
export async function fetchArmeniaNews(language: ArmeniaContentLanguage = 'hy'): Promise<NewsItem[]> {
  return (await fetchArmeniaContent(language)).newsItems;
}
