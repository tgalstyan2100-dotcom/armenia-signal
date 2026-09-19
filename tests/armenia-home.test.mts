import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterArmeniaSignalsForSection, rankArmeniaNews } from '../src/config/armenia-home.ts';
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

  it('rejects global stories without a material Armenia or South Caucasus link', () => {
    const ranked = rankArmeniaNews([
      news('China launches a new artificial intelligence model'),
      news('US markets rally after technology earnings'),
      news('Iran war drives motor oil price fears as Minnesota gas hits $4.47'),
      news('IAEA says cooling tower at Russia nuclear power plant hit by drone'),
    ], NOW);
    assert.deepEqual(ranked, []);
  });

  it('does not treat an Armenian newsroom as a blanket pass for unrelated world news', () => {
    const ranked = rankArmeniaNews([
      news('Iran war drives motor oil price fears as Minnesota gas hits $4.47', { source: 'Armenpress' }),
      news('US markets rally after technology earnings', { source: 'CivilNet' }),
    ], NOW);
    assert.deepEqual(ranked, []);
  });

  it('keeps Armenian newsroom stories with local institutional context even when Armenia is omitted from the headline', () => {
    const [signal] = rankArmeniaNews([
      news('Կառավարությունը հաստատել է նոր ներդրումային ծրագիրը', { source: 'Hetq' }),
    ], NOW);
    assert.ok(signal);
    assert.equal(signal.scope, 'armenia');
    assert.ok(signal.reasons.includes('armenia-source'));
  });

  it('admits explicit South Caucasus material developments as regional signals', () => {
    const [signal] = rankArmeniaNews([
      news('South Caucasus governments discuss North-South transport corridor investment'),
    ], NOW);
    assert.ok(signal);
    assert.equal(signal.scope, 'region');
    assert.ok(signal.tags.includes('economy'));
  });

  it('marks US, EU and China stories only when they carry an explicit material South Caucasus link', () => {
    const [signal] = rankArmeniaNews([
      news('EU announces sanctions talks tied to South Caucasus transport corridors'),
    ], NOW);
    assert.ok(signal);
    assert.equal(signal.scope, 'world-impact');
  });

  it('keeps neighboring-country stories when Armenia is explicit in the story itself', () => {
    const [signal] = rankArmeniaNews([
      news('Iran and Armenia agree new border trade and transport measures'),
    ], NOW);
    assert.ok(signal);
    assert.equal(signal.scope, 'armenia');
  });

  it('places cyber incidents in technology while preserving the security cross-tag', () => {
    const [signal] = rankArmeniaNews([news('Armenian bank reports cyber attack and data breach')], NOW);
    assert.ok(signal);
    assert.equal(signal.category, 'technology');
    assert.ok(signal.tags.includes('security'));
  });

  it('ranks direct Armenia impact above a South Caucasus regional signal', () => {
    const ranked = rankArmeniaNews([
      news('South Caucasus states discuss regional gas export tariffs'),
      news('Armenia opens a new technology investment program'),
    ], NOW);
    assert.equal(ranked[0]?.scope, 'armenia');
  });

  it('treats registered Armenian official sources as direct coverage and uses their domain as a category fallback', () => {
    const [signal] = rankArmeniaNews([
      news('Պաշտոնական հաղորդագրություն', { source: 'Ministry of Defence of Armenia' }),
    ], NOW);
    assert.ok(signal);
    assert.equal(signal.scope, 'armenia');
    assert.equal(signal.category, 'security');
    assert.ok(signal.reasons.includes('armenia-source') || signal.reasons.includes('armenia-mention'));
  });

  it('focuses menu sections without leaking unrelated global headlines', () => {
    const ranked = rankArmeniaNews([
      news('Armenian government reports cyber attack and data breach'),
      news('Central Bank of Armenia keeps the dram policy rate unchanged'),
      news('Armenian parliament opens diplomatic negotiations'),
      news('Iran war drives motor oil price fears as Minnesota gas hits $4.47'),
    ], NOW);
    assert.deepEqual(filterArmeniaSignalsForSection(ranked, 'economy').map((signal) => signal.category), ['economy']);
    assert.deepEqual(filterArmeniaSignalsForSection(ranked, 'technology').map((signal) => signal.category), ['technology']);
    assert.ok(filterArmeniaSignalsForSection(ranked, 'politics').every((signal) => signal.tags.includes('politics')));
    assert.ok(ranked.every((signal) => !signal.item.title.includes('Minnesota')));
  });
});
