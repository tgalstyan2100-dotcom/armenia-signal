import { ARMENIA_NEWS_FEEDS } from '@/config/armenia-feeds';
import type { NewsItem } from '@/types';
import { BRIEF_ONLY_RSS_FETCH_POLICY, fetchFeed } from './rss';

const MAX_ARMENIA_ITEMS = 40;

function headlineKey(item: NewsItem): string {
  return item.title
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Fetches the local editorial floor used only by Armenia Signal. */
export async function fetchArmeniaNews(): Promise<NewsItem[]> {
  const results = await Promise.all(
    ARMENIA_NEWS_FEEDS.map((feed) => fetchFeed(feed, { policy: BRIEF_ONLY_RSS_FETCH_POLICY })),
  );
  const seen = new Set<string>();
  return results
    .flat()
    .sort((left, right) => right.pubDate.getTime() - left.pubDate.getTime())
    .filter((item) => {
      const key = headlineKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ARMENIA_ITEMS);
}
