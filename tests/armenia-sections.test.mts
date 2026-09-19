import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_MAP_LAYERS, getInitialPanelSettingsForVariant } from '../src/config/panels.ts';
import { ARMENIA_CENTER, ARMENIA_MORE_SECTIONS, ARMENIA_PRIMARY_SECTIONS, ARMENIA_SECTIONS, applyArmeniaSectionToState } from '../src/config/armenia-sections.ts';
import { getArmeniaMapLayerLabel, getArmeniaMapUi } from '../src/config/armenia-map-ui.ts';

describe('Armenia Signal editorial sections', () => {
  it('keeps Armenia as the product map center', () => {
    assert.deepEqual(ARMENIA_CENTER, { lat: 40.18, lon: 44.51, zoom: 5.2 });
  });

  it('offers one visible desktop map-bearing entry instead of duplicate Home and Map tabs', () => {
    assert.deepEqual(ARMENIA_PRIMARY_SECTIONS.map((section) => section.id), ['home', 'security', 'economy', 'politics', 'technology']);
    assert.deepEqual(ARMENIA_MORE_SECTIONS.map((section) => section.id), ['energy', 'society', 'emergencies', 'region']);
    assert.ok(ARMENIA_SECTIONS.some((section) => section.id === 'map'), 'internal map section remains available for mobile/backward compatibility');
    assert.equal(ARMENIA_PRIMARY_SECTIONS.some((section) => section.id === 'map'), false);
    assert.equal(ARMENIA_MORE_SECTIONS.some((section) => section.id === 'map'), false);
    for (const section of ARMENIA_SECTIONS) for (const language of ['hy', 'ru', 'en'] as const) assert.ok(section.label[language]);
  });

  it('translates map controls and selectable layers in all three languages', () => {
    assert.equal(getArmeniaMapUi('hy').layers, 'ՇԵՐՏԵՐ');
    assert.equal(getArmeniaMapUi('ru').ranges.all, 'Все');
    assert.equal(getArmeniaMapUi('en').resetView, 'Reset view');
    assert.equal(getArmeniaMapLayerLabel('economic', 'fallback', 'hy'), 'Տնտեսական կենտրոններ');
    assert.equal(getArmeniaMapLayerLabel('economic', 'fallback', 'ru'), 'Экономические центры');
    assert.equal(getArmeniaMapLayerLabel('economic', 'fallback', 'en'), 'Economic centers');
  });

  it('keeps the map and the dedicated Armenia brief on Home', () => {
    const home = ARMENIA_SECTIONS.find((section) => section.id === 'home');
    assert.deepEqual(home?.panels, ['map', 'armenia-home']);
    const applied = applyArmeniaSectionToState('home', getInitialPanelSettingsForVariant('full'), DEFAULT_MAP_LAYERS);
    assert.equal(applied.panelSettings['armenia-home']?.enabled, true);
    assert.equal(applied.panelSettings.map?.enabled, true);
    assert.deepEqual(applied.panelOrder, ['armenia-home']);
  });

  it('does not present generic World Monitor panels as Armenia section data', () => {
    const current = getInitialPanelSettingsForVariant('full');
    const genericPanels = [
      'politics', 'gov', 'thinktanks', 'regional-intelligence',
      'consumer-prices', 'fx', 'fuel-prices', 'economic', 'markets',
      'energy-complex', 'supply-chain', 'trade-policy', 'sanctions-pressure',
      'strategic-posture', 'security-advisories', 'internet-disruptions',
      'tech', 'ai', 'security', 'startups', 'funding',
      'middleeast', 'europe', 'asia', 'us', 'insights', 'strategic-risk',
      'live-news',
    ];

    for (const section of ARMENIA_SECTIONS.filter((entry) => entry.id !== 'home' && entry.id !== 'map')) {
      assert.deepEqual(section.panels, ['armenia-home'], `${section.id} should expose Armenia-native signals only during stabilization`);
      const applied = applyArmeniaSectionToState(section.id, current, DEFAULT_MAP_LAYERS);
      assert.equal(applied.panelSettings['armenia-home']?.enabled, true, `${section.id} should keep Armenia signals enabled`);
      assert.equal(applied.panelSettings.map?.enabled, false, `${section.id} should not duplicate the Home map`);
      for (const panel of genericPanels) {
        assert.equal(applied.panelSettings[panel]?.enabled ?? false, false, `${section.id} should not enable generic panel ${panel}`);
      }
    }
  });

  it('keeps section-specific map-layer state without showing a second map panel', () => {
    const current = getInitialPanelSettingsForVariant('full');
    const security = applyArmeniaSectionToState('security', current, DEFAULT_MAP_LAYERS);
    const economy = applyArmeniaSectionToState('economy', current, DEFAULT_MAP_LAYERS);
    const technology = applyArmeniaSectionToState('technology', current, DEFAULT_MAP_LAYERS);

    assert.equal(security.mapLayers.cyberThreats, true);
    assert.equal(economy.mapLayers.economic, true);
    assert.equal(economy.mapLayers.tradeRoutes, true);
    assert.equal(technology.mapLayers.cyberThreats, true);
    assert.equal(security.panelSettings.map?.enabled, false);
    assert.equal(economy.panelSettings.map?.enabled, false);
    assert.equal(technology.panelSettings.map?.enabled, false);
  });
});
