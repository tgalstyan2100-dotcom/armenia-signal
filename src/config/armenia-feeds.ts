import { getArmeniaSourcesByReadiness } from '@/config/armenia-source-registry';
import type { Feed } from '@/types';
import { rssProxyUrl } from '@/utils';

/**
 * Canonical publisher URLs retained for source-attribution scanning.
 *
 * Runtime delivery below uses the already-approved news.google.com transport,
 * while these canonical URLs continue to describe the editorial publishers in
 * the attribution inventory.
 */
export const ARMENIA_SOURCE_ATTRIBUTION_URLS = [
  'https://hetq.am/hy/rss',
  'https://news.am/hy/rss',
  'https://banks.am/am/rss/93',
] as const;

/**
 * Match the Google News locale already used by the repository's known-working
 * international/site feeds. The site: filter keeps the editorial publisher
 * Armenia-specific; the Google News locale only controls the transport/search
 * endpoint and does not rewrite the publisher identity stored on NewsItem.
 */
function googleNewsForSite(host: string): string {
  const query = encodeURIComponent(`site:${host} when:7d`);
  return rssProxyUrl(`https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`);
}

/**
 * Runtime Armenia feed set.
 *
 * The registry is the source of truth for which Armenia sources are live.
 * Feed names remain the canonical Armenia registry names so source activity,
 * provenance and section fallback logic all key on the same identity.
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
