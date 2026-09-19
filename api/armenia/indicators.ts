import { getArmeniaIndicatorSnapshot } from '../../server/armenia/indicators';

export const config = { runtime: 'edge' };

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=900',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers() });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: headers() });
  }

  try {
    const snapshot = await getArmeniaIndicatorSnapshot();
    return new Response(JSON.stringify(snapshot), { status: 200, headers: headers() });
  } catch (error) {
    console.error('[Armenia Signal] indicator engine failed:', error);
    return new Response(JSON.stringify({
      error: 'ARMENIA_INDICATORS_UNAVAILABLE',
      version: 1,
      generatedAt: new Date().toISOString(),
      indicators: [],
      sources: [],
    }), {
      status: 503,
      headers: { ...headers(), 'Cache-Control': 'no-store' },
    });
  }
}
