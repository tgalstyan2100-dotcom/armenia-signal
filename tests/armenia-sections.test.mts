import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_MAP_LAYERS, getInitialPanelSettingsForVariant } from '../src/config/panels.ts';
import { ARMENIA_CENTER, ARMENIA_MORE_SECTIONS, ARMENIA_PRIMARY_SECTIONS, ARMENIA_SECTIONS, applyArmeniaSectionToState } from '../src/config/armenia-sections.ts';
import { getArmeniaMapLayerLabel, getArmeniaMapUi } from '../src/config/armenia-map-ui.ts';

describe('Armenia Signal editorial sections', () => {
  it('keeps Armenia as the product map center', () => {
    assert.deepEqual(ARMENIA_CENTER, { lat: 40.18, lon: 44.51, zoom: 5.2 });
  });
  it('offers the agreed navigation in Armenian, Russian and English', () => {
    assert.deepEqual(ARMENIA_PRIMARY_SECTIONS.map((section) => section.id), ['home', 'map', 'security', 'economy', 'politics', 'technology']);
    assert.deepEqual(ARMENIA_MORE_SECTIONS.map((section) => section.id), ['energy', 'society', 'emergencies', 'region']);
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
  it('makes economy a broad first-class dashboard', () => {
    const applied = applyArmeniaSectionToState('economy', getInitialPanelSettingsForVariant('full'), DEFAULT_MAP_LAYERS);
    for (const panel of ['armenia-home', 'markets', 'economic', 'consumer-prices', 'fx', 'fuel-prices', 'supply-chain', 'trade-policy', 'sanctions-pressure', 'energy-complex']) assert.equal(applied.panelSettings[panel]?.enabled, true, `${panel} should be enabled`);
    assert.equal(applied.mapLayers.economic, true);
    assert.equal(applied.mapLayers.tradeRoutes, true);
    assert.equal(applied.mapLayers.sanctions, true);
  });
  it('keeps the map and the dedicated Armenia brief on Home', () => {
    const home = ARMENIA_SECTIONS.find((section) => section.id === 'home');
    assert.deepEqual(home?.panels, ['map', 'armenia-home']);
    const applied = applyArmeniaSectionToState('home', getInitialPanelSettingsForVariant('full'), DEFAULT_MAP_LAYERS);
    assert.equal(applied.panelSettings['armenia-home']?.enabled, true);
    assert.equal(applied.panelSettings.map?.enabled, true);
    assert.deepEqual(applied.panelOrder, ['armenia-home']);
  });
  it('replaces unrelated global live television in every Armenia section', () => {
    const current = getInitialPanelSettingsForVariant('full');
    for (const section of ARMENIA_SECTIONS) {
      assert.ok(section.panels.includes('armenia-home'), `${section.id} should include Armenia signals`);
      assert.equal(section.panels.includes('live-news'), false, `${section.id} should not include global live TV`);
      const applied = applyArmeniaSectionToState(section.id, current, DEFAULT_MAP_LAYERS);
      assert.equal(applied.panelSettings['armenia-home']?.enabled, true);
      assert.equal(applied.panelSettings['live-news']?.enabled, false);
      assert.equal(applied.panelSettings.map?.enabled, section.id === 'home' || section.id === 'map', `${section.id} map visibility should match Home and the dedicated Map section`);
    }
  });
  it('cross-tags cyber signals into Security and Technology', () => {
    const current = getInitialPanelSettingsForVariant('full');
    assert.equal(applyArmeniaSectionToState('security', current).mapLayers.cyberThreats, true);
    const technology = applyArmeniaSectionToState('technology', current);
    assert.equal(technology.mapLayers.cyberThreats, true);
    assert.equal(technology.panelSettings.security?.enabled, true);
  });
});
