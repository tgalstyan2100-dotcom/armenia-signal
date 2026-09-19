import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ARMENIA_SOURCE_REGISTRY } from '../src/config/armenia-source-registry.ts';
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
    transport: 'google-news-site',
    ...overrides,
  };
}

describe('Armenia content engine relevance', () => {
  it('rejects unrelated global stories even when published by an Armenian newsroom', () => {
    const classified = classifyArmeniaArticle(
      article('armenpress', 'Iran war drives motor oil price fears as Minnesota gas hits $4.47'),
    );
    assert.equal(classified, null);
  });

  it('keeps Armenian local institutional stories from Armenian newsrooms', () => {
    const classified = classifyArmeniaArticle(
      article('hetq', 'Կառավարությունը հաստատել է նոր ներդրումային ծրագիրը'),
    );
    assert.ok(classified);
    assert.equal(classified.scope, 'armenia');
    assert.ok(classified.relevanceReasons.includes('armenia-source'));
  });

  it('keeps generic official records because the official source is itself primary evidence', () => {
    const classified = classifyArmeniaArticle(
      article('mil-am', 'Պաշտոնական հաղորդագրություն'),
    );
    assert.ok(classified);
    assert.equal(classified.scope, 'armenia');
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

  it('deduplicates the same story and prefers an official primary source as lead evidence', () => {
    const official = classifyArmeniaArticle(
      article('gov-am', 'Armenia launches a new investment support programme', {
        url: 'https://gov.am/example',
        publishedAt: '2026-09-19T07:00:00.000Z',
      }),
    );
    const newsroom = classifyArmeniaArticle(
      article('armenpress', 'Armenia launches new investment support programme', {
        url: 'https://armenpress.am/example',
        publishedAt: '2026-09-19T07:05:00.000Z',
      }),
    );
    assert.ok(official);
    assert.ok(newsroom);

    const signals = deduplicateArmeniaArticles([official, newsroom]);
    assert.equal(signals.length, 1);
    assert.equal(signals[0]?.sourceId, 'gov-am');
    assert.equal(signals[0]?.corroborationCount, 2);
    assert.equal(signals[0]?.evidence.length, 2);
  });
});
