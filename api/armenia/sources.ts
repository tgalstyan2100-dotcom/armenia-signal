import { getArmeniaContentSnapshot } from '../../server/armenia/content-engine';

export const config = { runtime: 'edge' };

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
    const snapshot = await getArmeniaContentSnapshot();
    return new Response(JSON.stringify({
      version: snapshot.version,
      generatedAt: snapshot.generatedAt,
      sources: snapshot.sources,
    }), {
      status: 200,
      headers: headers(),
    });
  } catch (error) {
    console.error('[Armenia Signal] source health failed:', error);
    return new Response(JSON.stringify({
      error: 'ARMENIA_SOURCE_HEALTH_UNAVAILABLE',
      version: 1,
      generatedAt: new Date().toISOString(),
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
