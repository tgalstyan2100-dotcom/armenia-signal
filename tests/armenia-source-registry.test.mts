import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ARMENIA_SOURCE_BY_ID,
  ARMENIA_SOURCE_REGISTRY,
  getArmeniaSourceFeedUrl,
  getArmeniaSourceHomepage,
  getArmeniaSourcesByReadiness,
  getArmeniaSourcesForDomain,
} from '../src/config/armenia-source-registry.ts';
import type { ArmeniaSignalDomain } from '../src/types/armenia-signal.ts';

describe('Armenia Signal source registry', () => {
  it('keeps source ids and hosts unique', () => {
    assert.equal(new Set(ARMENIA_SOURCE_REGISTRY.map((source) => source.id)).size, ARMENIA_SOURCE_REGISTRY.length);
    assert.equal(new Set(ARMENIA_SOURCE_REGISTRY.map((source) => source.host)).size, ARMENIA_SOURCE_REGISTRY.length);
  });

  it('covers every agreed Armenia-first monitoring domain', () => {
    const requiredDomains: ArmeniaSignalDomain[] = [
      'politics',
      'economy',
      'energy',
      'security',
      'infrastructure',
      'emergency',
      'society',
      'technology',
      'regional',
    ];

    for (const domain of requiredDomains) {
      const sources = getArmeniaSourcesForDomain(domain);
      assert.ok(sources.length >= 2, `${domain} should have at least two sources`);
      assert.ok(sources.some((source) => source.geography === 'armenia'), `${domain} should include an Armenia source`);
    }
  });

  it('includes core official primary/data sources without treating the registry as a ranking', () => {
    for (const id of ['gov-am', 'parliament-am', 'mfa-am', 'mil-am', 'cba-am', 'armstat-am', 'mineconomy-am', 'minfin-am', 'mtad-am', 'psrc-am', 'rescue-am']) {
      const source = ARMENIA_SOURCE_BY_ID.get(id);
      assert.ok(source, `${id} should exist`);
      assert.ok(source.provenance === 'official-primary' || source.provenance === 'official-data');
      assert.equal(source.verificationPolicy, 'primary-record');
    }
  });

  it('separates already-live editorial feeds from planned adapters and official sources', () => {
    const live = getArmeniaSourcesByReadiness('live');
    const planned = getArmeniaSourcesByReadiness('planned');

    assert.deepEqual(
      live.map((source) => source.name).sort(),
      ['ARKA', 'Armenpress', 'Azatutyun', 'Banks.am', 'CivilNet', 'Hetq', 'NEWS.am', 'Panorama.am'].sort(),
    );
    assert.ok(planned.some((source) => source.id === 'gov-am'));
    assert.ok(planned.some((source) => source.id === 'armstat-am'));
    assert.ok(planned.some((source) => source.id === 'oc-media'));
  });

  it('builds source URLs from host plus path without duplicating external URL literals', () => {
    const hetq = ARMENIA_SOURCE_BY_ID.get('hetq');
    const gov = ARMENIA_SOURCE_BY_ID.get('gov-am');
    assert.ok(hetq && gov);
    assert.equal(getArmeniaSourceHomepage(gov), 'https://gov.am/');
    assert.equal(getArmeniaSourceFeedUrl(hetq), 'https://hetq.am/hy/rss');
    assert.equal(getArmeniaSourceFeedUrl(gov), null);
  });
});
