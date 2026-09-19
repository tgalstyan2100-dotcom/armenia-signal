import type { ArmeniaSignalDomain } from '../../src/types/armenia-signal';
import { getArmeniaContentSnapshot } from '../../server/armenia/content-engine';

export const config = { runtime: 'edge' };

const VALID_DOMAINS = new Set<ArmeniaSignalDomain>([
  'politics',
  'economy',
  'energy',
  'security',
  'infrastructure',
  'emergency',
  'society',
  'technology',
  'regional',
]);

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=300',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: headers() });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: headers(),
    });
  }

  try {
    const url = new URL(req.url);
    const section = url.searchParams.get('section');
    const requestedLimit = Number(url.searchParams.get('limit') ?? 80);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 80;

    const snapshot = await getArmeniaContentSnapshot();
    const signals = section && VALID_DOMAINS.has(section as ArmeniaSignalDomain)
      ? snapshot.signals.filter((signal) => signal.domains.includes(section as ArmeniaSignalDomain))
      : snapshot.signals;

    return new Response(JSON.stringify({
      ...snapshot,
      signals: signals.slice(0, limit),
    }), {
      status: 200,
      headers: headers(),
    });
  } catch (error) {
    console.error('[Armenia Signal] content engine failed:', error);
    return new Response(JSON.stringify({
      error: 'ARMENIA_CONTENT_UNAVAILABLE',
      version: 1,
      generatedAt: new Date().toISOString(),
      signals: [],
      sources: [],
    }), {
      status: 503,
      headers: {
        ...headers(),
        'Cache-Control': 'no-store',
      },
    });
  }
}
