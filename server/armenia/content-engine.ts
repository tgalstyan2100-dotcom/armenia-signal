import {
  getArmeniaSourcesByReadiness,
} from '../../src/config/armenia-source-registry';
import type {
  ArmeniaContentSnapshot,
  ArmeniaSourceHealth,
} from '../../src/types/armenia-signal';
import { deduplicateArmeniaArticles } from './dedupe';
import { classifyArmeniaArticle } from './relevance';
import { fetchArmeniaSource } from './source-adapters';

const SNAPSHOT_CACHE_TTL_MS = 2 * 60 * 1_000;
const MAX_SIGNAL_AGE_MS = 14 * 24 * 60 * 60 * 1_000;
const MAX_SIGNALS = 80;

let cachedSnapshot: ArmeniaContentSnapshot | null = null;
let cachedAt = 0;
let inFlight: Promise<ArmeniaContentSnapshot> | null = null;

function isFreshEnough(publishedAt: string | undefined, now: number): boolean {
  if (!publishedAt) return true;
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return true;
  if (timestamp > now + 24 * 60 * 60 * 1_000) return false;
  return now - timestamp <= MAX_SIGNAL_AGE_MS;
}

async function buildSnapshot(): Promise<ArmeniaContentSnapshot> {
  const sources = getArmeniaSourcesByReadiness('live');
  const results = await Promise.all(sources.map((source) => fetchArmeniaSource(source)));
  const now = Date.now();

  const classified = results
    .flatMap((result) => result.items)
    .filter((item) => isFreshEnough(item.publishedAt, now))
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
    generatedAt: new Date().toISOString(),
    signals: deduplicateArmeniaArticles(classified).slice(0, MAX_SIGNALS),
    sources: health,
  };
}

export async function getArmeniaContentSnapshot(
  options: { force?: boolean } = {},
): Promise<ArmeniaContentSnapshot> {
  const now = Date.now();
  if (!options.force && cachedSnapshot && now - cachedAt < SNAPSHOT_CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  if (!options.force && inFlight) return inFlight;

  const build = buildSnapshot()
    .then((snapshot) => {
      cachedSnapshot = snapshot;
      cachedAt = Date.now();
      return snapshot;
    })
    .finally(() => {
      if (inFlight === build) inFlight = null;
    });

  inFlight = build;
  return build;
}
