import type { ArmeniaIndicatorSnapshot } from '@/types/armenia-indicators';

const CACHE_TTL_MS = 5 * 60 * 1_000;
let cached: ArmeniaIndicatorSnapshot | null = null;
let cachedAt = 0;
let inFlight: Promise<ArmeniaIndicatorSnapshot> | null = null;

function isSnapshot(value: unknown): value is ArmeniaIndicatorSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArmeniaIndicatorSnapshot>;
  return candidate.version === 1
    && typeof candidate.generatedAt === 'string'
    && Array.isArray(candidate.indicators)
    && Array.isArray(candidate.sources);
}

async function requestSnapshot(): Promise<ArmeniaIndicatorSnapshot> {
  const response = await fetch('/api/armenia/indicators', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`Armenia indicators API returned HTTP ${response.status}`);
  const data = await response.json() as unknown;
  if (!isSnapshot(data)) throw new Error('Armenia indicators API returned an invalid payload');
  return data;
}

export async function fetchArmeniaIndicators(force = false): Promise<ArmeniaIndicatorSnapshot> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_TTL_MS) return cached;
  if (!force && inFlight) return inFlight;

  const request = requestSnapshot()
    .then((snapshot) => {
      cached = snapshot;
      cachedAt = Date.now();
      return snapshot;
    })
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });
  inFlight = request;
  return request;
}
