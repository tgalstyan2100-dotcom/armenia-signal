import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_MAP_LAYERS, getInitialPanelSettingsForVariant } from '../src/config/panels.ts';
import { ARMENIA_CENTER, ARMENIA_MORE_SECTIONS, ARMENIA_PRIMARY_SECTIONS, ARMENIA_SECTIONS, applyArmeniaSectionToState } from '../src/config/armenia-sections.ts';

describe('Armenia Signal editorial sections', () => {
  it('keeps Armenia as the product map center', () => {
    assert.deepEqual(ARMENIA_CENTER, { lat: 40.18, lon: 44.51, zoom: 5.2 });
  });
  it('offers the agreed navigation in Armenian, Russian and English', () => {
    assert.deepEqual(ARMENIA_PRIMARY_SECTIONS.map((section) => section.id), ['home', 'map', 'security', 'economy', 'politics', 'technology']);
    assert.deepEqual(ARMENIA_MORE_SECTIONS.map((section) => section.id), ['energy', 'society', 'emergencies', 'region']);
    for (const section of ARMENIA_SECTIONS) for (const language of ['hy', 'ru', 'en'] as const) assert.ok(section.label[language]);
  });
  it('makes economy a broad first-class dashboard', () => {
    const applied = applyArmeniaSectionToState('economy', getInitialPanelSettingsForVariant('full'), DEFAULT_MAP_LAYERS);
    for (const panel of ['markets', 'economic', 'macro-signals', 'consumer-prices', 'fx', 'supply-chain', 'trade-policy', 'sanctions-pressure', 'energy-complex']) assert.equal(applied.panelSettings[panel]?.enabled, true, `${panel} should be enabled`);
    assert.equal(applied.mapLayers.economic, true);
    assert.equal(applied.mapLayers.tradeRoutes, true);
    assert.equal(applied.mapLayers.sanctions, true);
  });
  it('cross-tags cyber signals into Security and Technology', () => {
    const current = getInitialPanelSettingsForVariant('full');
    assert.equal(applyArmeniaSectionToState('security', current).mapLayers.cyberThreats, true);
    const technology = applyArmeniaSectionToState('technology', current);
    assert.equal(technology.mapLayers.cyberThreats, true);
    assert.equal(technology.panelSettings.security?.enabled, true);
  });
});
