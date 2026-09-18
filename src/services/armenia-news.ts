import { ARMENIA_NEWS_FEEDS } from '@/config/armenia-feeds';
import type { NewsItem } from '@/types';
import { BRIEF_ONLY_RSS_FETCH_POLICY, fetchFeed } from './rss';

const MAX_ARMENIA_ITEMS = 80;

function headlineKey(item: NewsItem): string {
  return item.title
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function newestFirst(left: NewsItem, right: NewsItem): number {
  return right.pubDate.getTime() - left.pubDate.getTime();
}

/**
 * Fetches the Armenia-first editorial floor used by Armenia Signal.
 *
 * The first pass keeps one fresh item from every responding source before the
 * remaining capacity is filled by recency. This prevents a few high-volume
 * publishers from crowding every other Armenian source out of the brief.
 */
export async function fetchArmeniaNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    ARMENIA_NEWS_FEEDS.map((feed) => fetchFeed(feed, { policy: BRIEF_ONLY_RSS_FETCH_POLICY })),
  );

  const buckets = results.map((result) => (
    result.status === 'fulfilled'
      ? [...result.value].sort(newestFirst)
      : []
  ));

  const selected: NewsItem[] = [];
  const seen = new Set<string>();

  // Coverage floor: one unique fresh story per responding Armenia source.
  for (const items of buckets) {
    for (const item of items) {
      const key = headlineKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      selected.push(item);
      break;
    }
  }

  // Fill the rest strictly by freshness, preserving headline de-duplication.
  const remaining = buckets.flat().sort(newestFirst);
  for (const item of remaining) {
    if (selected.length >= MAX_ARMENIA_ITEMS) break;
    const key = headlineKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(item);
  }

  return selected.sort(newestFirst).slice(0, MAX_ARMENIA_ITEMS);
}
