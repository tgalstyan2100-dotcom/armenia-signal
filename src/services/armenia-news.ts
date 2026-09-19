import type {
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

let cachedSnapshot: ArmeniaContentSnapshot | null = null;
let cachedAt = 0;
let inFlight: Promise<ArmeniaContentSnapshot> | null = null;

export interface ArmeniaContentClientSnapshot {
  generatedAt: string;
  newsItems: NewsItem[];
  signals: ArmeniaRankedSignal[];
  sources: ArmeniaSourceHealth[];
}

function domainToCategory(domain: ArmeniaSignalDomain): ArmeniaSignalCategory {
  switch (domain) {
    case 'infrastructure':
      return 'economy';
    case 'emergency':
      return 'society';
    case 'regional':
      return 'region';
    default:
      return domain;
  }
}

function scopeToUi(scope: ArmeniaContentSignal['scope']): ArmeniaSignalScope {
  if (scope === 'south-caucasus') return 'region';
  if (scope === 'external-impact') return 'world-impact';
  return 'armenia';
}

function reasonToUi(
  reason: ArmeniaContentSignal['relevanceReasons'][number],
): ArmeniaRelevanceReason {
  return reason;
}

function signalToNewsItem(signal: ArmeniaContentSignal): NewsItem {
  const publishedAt = signal.publishedAt ? new Date(signal.publishedAt) : new Date(signal.observedAt);
  return {
    source: signal.sourceName,
    title: signal.title,
    link: signal.url,
    pubDate: publishedAt,
    pubDateMissing: !signal.publishedAt,
    isAlert: signal.urgency === 'critical' || signal.urgency === 'high',
    ...(signal.summary ? { snippet: signal.summary } : {}),
    importanceScore: signal.relevanceScore,
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
    score: signal.relevanceScore,
  };
}

function isSnapshot(value: unknown): value is ArmeniaContentSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArmeniaContentSnapshot>;
  return candidate.version === 1
    && typeof candidate.generatedAt === 'string'
    && Array.isArray(candidate.signals)
    && Array.isArray(candidate.sources);
}

async function requestSnapshot(): Promise<ArmeniaContentSnapshot> {
  const response = await fetch('/api/armenia/signals', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new Error(`Armenia content API returned HTTP ${response.status}`);
  }
  const data = await response.json() as unknown;
  if (!isSnapshot(data)) {
    throw new Error('Armenia content API returned an invalid payload');
  }
  return data;
}

export async function fetchArmeniaContent(): Promise<ArmeniaContentClientSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now - cachedAt < CLIENT_CACHE_TTL_MS) {
    return {
      generatedAt: cachedSnapshot.generatedAt,
      newsItems: cachedSnapshot.signals.map(signalToNewsItem),
      signals: cachedSnapshot.signals.map(signalToRanked),
      sources: [...cachedSnapshot.sources],
    };
  }

  if (!inFlight) {
    inFlight = requestSnapshot()
      .then((snapshot) => {
        cachedSnapshot = snapshot;
        cachedAt = Date.now();
        return snapshot;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  const snapshot = await inFlight;
  return {
    generatedAt: snapshot.generatedAt,
    newsItems: snapshot.signals.map(signalToNewsItem),
    signals: snapshot.signals.map(signalToRanked),
    sources: [...snapshot.sources],
  };
}

/**
 * Compatibility bridge for the global news loader.
 *
 * The returned items are already Armenia-filtered by the server content engine.
 * ArmeniaHomePanel itself no longer consumes the global allNews corpus.
 */
export async function fetchArmeniaNews(): Promise<NewsItem[]> {
  const snapshot = await fetchArmeniaContent();
  return snapshot.newsItems;
}
