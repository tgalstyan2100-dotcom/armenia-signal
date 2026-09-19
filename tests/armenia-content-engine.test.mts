import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ARMENIA_SOURCE_REGISTRY } from '../src/config/armenia-source-registry.ts';
import { armeniaFreshnessScore } from '../server/armenia/content-quality.ts';
import { deduplicateArmeniaArticles } from '../server/armenia/dedupe.ts';
import { classifyArmeniaArticle } from '../server/armenia/relevance.ts';
import type { RawArmeniaArticle } from '../server/armenia/source-adapters.ts';

function source(id: string) {
  const found = ARMENIA_SOURCE_REGISTRY.find((entry) => entry.id === id);
  assert.ok(found, `missing source ${id}`);
  return found;
}

function article(
  sourceId: string,
  title: string,
  overrides: Partial<RawArmeniaArticle> = {},
): RawArmeniaArticle {
  return {
    source: source(sourceId),
    title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    observedAt: '2026-09-19T08:00:00.000Z',
    discoveredAt: '2026-09-19T07:00:00.000Z',
    transport: 'google-news-site',
    language: 'en',
    publishedAtVerified: false,
    ...overrides,
  };
}

describe('Armenia content engine v2', () => {
  it('rejects unrelated global stories even when published by an Armenian newsroom', () => {
    const classified = classifyArmeniaArticle(
      article('armenpress', 'Iran war drives motor oil price fears as Minnesota gas hits $4.47'),
    );
    assert.equal(classified, null);
  });

  it('rejects static/admin pages that were previously shown as live signals', () => {
    assert.equal(classifyArmeniaArticle(article('hightech-am', 'Untitled - Հայաստանի Հանրապետության Բարձր տեխնոլոգիական արդյունաբերության նախարարություն')), null);
    assert.equal(classifyArmeniaArticle(article('mineconomy-am', 'Ministry Structure - Հայաստանի Հանրապետության Էկոնոմիկայի Նախարարություն')), null);
    assert.equal(classifyArmeniaArticle(article('mtad-am', '❖ ❖ ❖ ❖ ❖ ❖ - tavush.mtad.am')), null);
  });

  it('keeps Armenian local institutional stories from Armenian newsrooms', () => {
    const classified = classifyArmeniaArticle(
      article('hetq', 'Կառավարությունը հաստատել է նոր ներդրումային ծրագիրը', { language: 'hy' }),
    );
    assert.ok(classified);
    assert.equal(classified.scope, 'armenia');
    assert.ok(classified.relevanceReasons.includes('armenia-source'));
  });

  it('uses one conservative source-domain fallback rather than every source domain', () => {
    const classified = classifyArmeniaArticle(
      article('mil-am', 'Պաշտոնական հաղորդագրություն', { language: 'hy' }),
    );
    assert.ok(classified);
    assert.deepEqual(classified.domains, ['security']);
    assert.equal(classified.primaryDomain, 'security');
  });

  it('accepts material South Caucasus developments but not a neighboring-country keyword alone', () => {
    const regional = classifyArmeniaArticle(
      article('oc-media', 'South Caucasus states discuss North-South transport corridor investment'),
    );
    assert.ok(regional);
    assert.equal(regional.scope, 'south-caucasus');

    const unrelated = classifyArmeniaArticle(
      article('oc-media', 'Iran oil prices rise after refinery maintenance'),
    );
    assert.equal(unrelated, null);
  });

  it('does not treat a Google News discovery timestamp as a verified publication date', () => {
    const raw = article('gov-am', 'Armenia approves a new investment programme');
    assert.equal(raw.publishedAtVerified, false);
    assert.ok(armeniaFreshnessScore(raw, Date.parse('2026-09-19T08:00:00.000Z')) <= 58);
    const classified = classifyArmeniaArticle(raw);
    assert.ok(classified);
    assert.ok(classified.importanceScore <= 64);
  });

  it('lets verified direct-feed material outrank an unverified recrawl of a low-value page', () => {
    const direct = classifyArmeniaArticle(article('news-am', 'Հայաստանում հաստատվել է նոր տնտեսական ծրագիր', {
      transport: 'direct-rss',
      language: 'hy',
      publishedAt: '2026-09-19T07:30:00.000Z',
      discoveredAt: undefined,
      publishedAtVerified: true,
    }));
    const recrawl = classifyArmeniaArticle(article('gov-am', 'Armenia ministry announces a working meeting on investment', {
      discoveredAt: '2026-09-19T07:40:00.000Z',
    }));
    assert.ok(direct);
    assert.ok(recrawl);
    assert.ok(direct.importanceScore > recrawl.importanceScore);
  });

  it('deduplicates the same story and keeps provenance/corroboration separate from relevance', () => {
    const official = classifyArmeniaArticle(
      article('gov-am', 'Armenia launches a new investment support programme', {
        url: 'https://gov.am/example',
        transport: 'direct-rss',
        publishedAt: '2026-09-19T07:00:00.000Z',
        discoveredAt: undefined,
        publishedAtVerified: true,
      }),
    );
    const newsroom = classifyArmeniaArticle(
      article('armenpress', 'Armenia launches new investment support programme', {
        url: 'https://armenpress.am/example',
        discoveredAt: '2026-09-19T07:05:00.000Z',
      }),
    );
    assert.ok(official);
    assert.ok(newsroom);

    const signals = deduplicateArmeniaArticles([official, newsroom]);
    assert.equal(signals.length, 1);
    assert.equal(signals[0]?.sourceId, 'gov-am');
    assert.equal(signals[0]?.corroborationCount, 2);
    assert.equal(signals[0]?.evidence.length, 2);
    assert.ok((signals[0]?.importanceScore ?? 0) > 0);
    assert.ok((signals[0]?.relevanceScore ?? 0) > 0);
  });
});
