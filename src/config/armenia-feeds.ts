import { getArmeniaSourcesByReadiness } from '@/config/armenia-source-registry';
import type { Feed } from '@/types';
import { rssProxyUrl } from '@/utils';

function googleNewsForSite(host: string): string {
  const query = encodeURIComponent(`site:${host} when:7d`);
  return rssProxyUrl(`https://news.google.com/rss/search?q=${query}&hl=hy&gl=AM&ceid=AM:hy`);
}

/**
 * Runtime Armenia feed set.
 *
 * The registry is the source of truth for which Armenia sources are live.
 * We intentionally use Google News site discovery for the Armenia brief even
 * when a source also exposes a direct RSS path. That keeps the runtime on the
 * already-approved news.google.com transport while the direct Armenian RSS
 * hosts are being added to the proxy allowlist and health checks.
 */
const LIVE_ARMENIA_SOURCES = getArmeniaSourcesByReadiness('live')
  .filter((source) => source.geography === 'armenia');

export const ARMENIA_NEWS_FEEDS: readonly Feed[] = LIVE_ARMENIA_SOURCES.map((source) => ({
  name: source.name,
  url: googleNewsForSite(source.host),
  lang: source.languages.includes('hy') ? 'hy' : source.languages[0],
  region: 'Armenia',
  strategicDefault: true,
}));

export const ARMENIA_NEWS_SOURCE_NAMES = ARMENIA_NEWS_FEEDS.map((feed) => feed.name);
