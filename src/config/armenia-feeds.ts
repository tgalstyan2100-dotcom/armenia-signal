import type { Feed } from '@/types';
import { rssProxyUrl } from '@/utils';

function googleNewsForSite(host: string): string {
  const query = encodeURIComponent(`site:${host} when:3d`);
  return rssProxyUrl(`https://news.google.com/rss/search?q=${query}&hl=hy&gl=AM&ceid=AM:hy`);
}

/**
 * Armenia-first publishers fetched specifically for the Armenia Signal brief.
 * They are intentionally separate from the global World Monitor presets: the
 * panel needs dependable local coverage without enabling another generic news
 * panel or widening every user's global digest.
 */
export const ARMENIA_NEWS_FEEDS: readonly Feed[] = [
  { name: 'Armenpress', url: googleNewsForSite('armenpress.am') },
  { name: 'CivilNet', url: googleNewsForSite('civilnet.am') },
  { name: 'Hetq', url: googleNewsForSite('hetq.am') },
  { name: 'Azatutyun', url: googleNewsForSite('azatutyun.am') },
  { name: 'NEWS.am', url: googleNewsForSite('news.am') },
  { name: 'ARKA', url: googleNewsForSite('arka.am') },
  { name: 'Banks.am', url: googleNewsForSite('banks.am') },
  { name: 'Panorama.am', url: googleNewsForSite('panorama.am') },
] as const;
