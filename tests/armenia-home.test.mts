import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankArmeniaNews } from '../src/config/armenia-home.ts';
import type { NewsItem } from '../src/types/index.ts';

const NOW = new Date('2026-09-18T08:00:00Z').getTime();

function news(title: string, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    source: 'Test Wire',
    title,
    link: 'https://example.com/story',
    pubDate: new Date(NOW - 60 * 60 * 1000),
    isAlert: false,
    ...overrides,
  };
}

describe('Armenia home relevance', () => {
  it('keeps direct Armenian economic signals and classifies them as economy', () => {
    const [signal] = rankArmeniaNews([news('Central Bank of Armenia keeps the dram policy rate unchanged')], NOW);
    assert.ok(signal);
    assert.equal(signal.scope, 'armenia');
    assert.equal(signal.category, 'economy');
    assert.ok(signal.score >= 70);
  });

  it('rejects global stories without a material Armenia or regional link', () => {
    const ranked = rankArmeniaNews([
      news('China launches a new artificial intelligence model'),
      news('US markets rally after technology earnings'),
    ], NOW);
    assert.deepEqual(ranked, []);
  });

  it('admits material developments in the permanent neighboring-country core', () => {
    const [signal] = rankArmeniaNews([news('Iran and Georgia discuss North-South transport corridor investment')], NOW);
    assert.ok(signal);
    assert.equal(signal.scope, 'region');
    assert.ok(signal.tags.includes('economy'));
  });

  it('marks US, EU and China stories only when they carry a material regional link', () => {
    const [signal] = rankArmeniaNews([news('EU and Iran announce sanctions talks affecting the North-South trade corridor')], NOW);
    assert.ok(signal);
    assert.equal(signal.scope, 'world-impact');
  });

  it('places cyber incidents in technology while preserving the security cross-tag', () => {
    const [signal] = rankArmeniaNews([news('Armenian bank reports cyber attack and data breach')], NOW);
    assert.ok(signal);
    assert.equal(signal.category, 'technology');
    assert.ok(signal.tags.includes('security'));
  });

  it('ranks direct Armenia impact above a neighboring-country signal', () => {
    const ranked = rankArmeniaNews([
      news('Turkey changes regional gas export tariff'),
      news('Armenia opens a new technology investment program'),
    ], NOW);
    assert.equal(ranked[0]?.scope, 'armenia');
  });
});
