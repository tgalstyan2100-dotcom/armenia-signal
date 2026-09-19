import {
  getArmeniaSourcesByReadiness,
} from '../../src/config/armenia-source-registry';
import type {
  ArmeniaContentLanguage,
  ArmeniaContentSnapshot,
  ArmeniaSourceHealth,
} from '../../src/types/armenia-signal';
import { deduplicateArmeniaArticles } from './dedupe';
import { classifyArmeniaArticle } from './relevance';
import { fetchArmeniaSource } from './source-adapters';

const SNAPSHOT_CACHE_TTL_MS = 2 * 60 * 1_000;
const MAX_SIGNAL_AGE_MS = 14 * 24 * 60 * 60 * 1_000;
const MAX_SIGNALS = 80;

interface CacheEntry {
  snapshot: ArmeniaContentSnapshot | null;
  cachedAt: number;
  inFlight: Promise<ArmeniaContentSnapshot> | null;
}

const caches = new Map<ArmeniaContentLanguage, CacheEntry>();

function cacheFor(language: ArmeniaContentLanguage): CacheEntry {
  let entry = caches.get(language);
  if (!entry) {
    entry = { snapshot: null, cachedAt: 0, inFlight: null };
    caches.set(language, entry);
  }
  return entry;
}

function isFreshEnough(
  item: { publishedAt?: string; discoveredAt?: string; observedAt: string },
  now: number,
): boolean {
  const raw = item.publishedAt ?? item.discoveredAt ?? item.observedAt;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return false;
  if (timestamp > now + 24 * 60 * 60 * 1_000) return false;
  return now - timestamp <= MAX_SIGNAL_AGE_MS;
}

async function buildSnapshot(language: ArmeniaContentLanguage): Promise<ArmeniaContentSnapshot> {
  const sources = getArmeniaSourcesByReadiness('live');
  const results = await Promise.all(sources.map((source) => fetchArmeniaSource(source, language)));
  const now = Date.now();

  const classified = results
    .flatMap((result) => result.items)
    .filter((item) => isFreshEnough(item, now))
    .map((item) => classifyArmeniaArticle(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const relevantBySource = new Map<string, number>();
  for (const item of classified) {
    relevantBySource.set(item.source.id, (relevantBySource.get(item.source.id) ?? 0) + 1);
  }

  const health: ArmeniaSourceHealth[] = results.map((result) => ({
    sourceId: result.source.id,
    sourceName: result.source.name,
    host: result.source.host,
    state: result.state,
    primaryTransport: result.primaryTransport,
    ...(result.transportUsed ? { transportUsed: result.transportUsed } : {}),
    itemCount: result.items.length,
    relevantItemCount: relevantBySource.get(result.source.id) ?? 0,
    checkedAt: result.checkedAt,
    ...(result.errorCode ? { errorCode: result.errorCode } : {}),
  }));

  return {
    version: 1,
    language,
    generatedAt: new Date().toISOString(),
    signals: deduplicateArmeniaArticles(classified, language).slice(0, MAX_SIGNALS),
    sources: health,
  };
}

export async function getArmeniaContentSnapshot(
  options: { force?: boolean; language?: ArmeniaContentLanguage } = {},
): Promise<ArmeniaContentSnapshot> {
  const language = options.language ?? 'hy';
  const entry = cacheFor(language);
  const now = Date.now();

  if (!options.force && entry.snapshot && now - entry.cachedAt < SNAPSHOT_CACHE_TTL_MS) {
    return entry.snapshot;
  }
  if (!options.force && entry.inFlight) return entry.inFlight;

  const build = buildSnapshot(language)
    .then((snapshot) => {
      entry.snapshot = snapshot;
      entry.cachedAt = Date.now();
      return snapshot;
    })
    .finally(() => {
      if (entry.inFlight === build) entry.inFlight = null;
    });

  entry.inFlight = build;
  return build;
}
