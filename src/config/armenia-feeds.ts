import { getArmeniaSourcesByReadiness } from '@/config/armenia-source-registry';
import type { Feed } from '@/types';

/** Canonical publisher URLs retained for source-attribution scanning. */
export const ARMENIA_SOURCE_ATTRIBUTION_URLS = [
  'https://hetq.am/hy/rss',
  'https://news.am/hy/rss',
  'https://banks.am/am/rss/93',
] as const;

const LIVE_ARMENIA_SOURCES = getArmeniaSourcesByReadiness('live')
  .filter((source) => source.geography === 'armenia');

/** Canonical identities used by Armenia source-health UI. */
export const ARMENIA_NEWS_SOURCE_NAMES = LIVE_ARMENIA_SOURCES.map((source) => source.name);

/**
 * Compatibility export only.
 *
 * Armenia Signal v2 deliberately exposes no browser-side RSS feed list. The
 * backend Content Engine owns all fetch/retry/fallback/normalization work and
 * the frontend reads only /api/armenia/signals. Keeping this empty export
 * avoids breaking any upstream imports while preventing a second parallel
 * Google News/rss-proxy pipeline from being reintroduced by accident.
 */
export const ARMENIA_NEWS_FEEDS: readonly Feed[] = [];
