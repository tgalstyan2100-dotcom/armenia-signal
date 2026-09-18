import { ALL_PANELS, DEFAULT_MAP_LAYERS, getEffectivePanelConfig } from '@/config/panels';
import { sanitizeLayersForVariant } from '@/config/map-layer-definitions';
import type { MapLayers, PanelConfig } from '@/types';

export const ARMENIA_CENTER = { lat: 40.18, lon: 44.51, zoom: 5.2 } as const;

export type ArmeniaLanguage = 'hy' | 'ru' | 'en';
export type ArmeniaSectionId = 'home' | 'map' | 'security' | 'economy' | 'politics' | 'technology' | 'energy' | 'society' | 'emergencies' | 'region';
type LocalizedText = Record<ArmeniaLanguage, string>;

export interface ArmeniaSection {
  id: ArmeniaSectionId;
  label: LocalizedText;
  shortLabel: LocalizedText;
  panels: string[];
  layers: Array<keyof MapLayers>;
  timeRange: '1h' | '6h' | '24h' | '48h' | '7d' | 'all';
  more?: boolean;
}

export const ARMENIA_UI = {
  more: { hy: 'Ավելին', ru: 'Ещё', en: 'More' },
  language: { hy: 'Լեզու', ru: 'Язык', en: 'Language' },
  sections: { hy: 'Բաժիններ', ru: 'Разделы', en: 'Sections' },
  applied: { hy: 'Բաժինը բացված է', ru: 'Раздел открыт', en: 'Section opened' },
  mapTitle: { hy: 'ՀԱՅԱՍՏԱՆԻ ԻՐԱՎԻՃԱԿ', ru: 'ОБСТАНОВКА В АРМЕНИИ', en: 'ARMENIA SITUATION' },
  search: { hy: 'Որոնում', ru: 'Поиск', en: 'Search' },
  alerts: { hy: 'Ահազանգեր', ru: 'Сигналы', en: 'Alerts' },
} satisfies Record<string, LocalizedText>;

export const ARMENIA_SECTIONS: readonly ArmeniaSection[] = [
  {
    id: 'home', label: { hy: 'Գլխավոր', ru: 'Главная', en: 'Home' }, shortLabel: { hy: 'Գլխավոր', ru: 'Главная', en: 'Home' },
    panels: ['armenia-home', 'map', 'live-news', 'markets', 'economic', 'politics', 'tech', 'energy', 'insights', 'strategic-posture', 'intel', 'gdelt-intel', 'economic-correlation'],
    layers: ['hotspots', 'conflicts', 'sanctions', 'economic', 'outages', 'weather', 'natural'], timeRange: '24h',
  },
  {
    id: 'map', label: { hy: 'Քարտեզ', ru: 'Карта', en: 'Map' }, shortLabel: { hy: 'Քարտեզ', ru: 'Карта', en: 'Map' },
    panels: ['map', 'live-news', 'insights', 'cii', 'strategic-risk'],
    layers: ['hotspots', 'conflicts', 'military', 'bases', 'nuclear', 'sanctions', 'economic', 'outages', 'weather', 'natural', 'protests', 'ucdpEvents', 'waterways', 'pipelines'], timeRange: '48h',
  },
  {
    id: 'security', label: { hy: 'Անվտանգություն', ru: 'Безопасность', en: 'Security' }, shortLabel: { hy: 'Անվտանգություն', ru: 'Безопасность', en: 'Security' },
    panels: ['map', 'live-news', 'insights', 'strategic-posture', 'cii', 'strategic-risk', 'cascade', 'military-correlation', 'escalation-correlation', 'ucdp-events', 'security-advisories', 'sanctions-pressure', 'radiation-watch', 'thermal-escalation'],
    layers: ['conflicts', 'hotspots', 'military', 'bases', 'nuclear', 'protests', 'ucdpEvents', 'sanctions', 'outages', 'cyberThreats', 'natural', 'ciiChoropleth'], timeRange: '24h',
  },
  {
    id: 'economy', label: { hy: 'Տնտեսություն', ru: 'Экономика', en: 'Economy' }, shortLabel: { hy: 'Տնտեսություն', ru: 'Экономика', en: 'Economy' },
    panels: ['map', 'live-news', 'markets', 'economic', 'macro-signals', 'consumer-prices', 'fx', 'fuel-prices', 'finance', 'commodities', 'energy-complex', 'supply-chain', 'trade-policy', 'sanctions-pressure', 'economic-correlation', 'gold-intelligence', 'national-debt', 'market-implications'],
    layers: ['economic', 'stockExchanges', 'centralBanks', 'financialCenters', 'tradeRoutes', 'pipelines', 'waterways', 'commodityHubs', 'commodityPorts', 'sanctions', 'outages'], timeRange: '7d',
  },
  {
    id: 'politics', label: { hy: 'Քաղաքականություն', ru: 'Политика', en: 'Politics' }, shortLabel: { hy: 'Քաղաքականություն', ru: 'Политика', en: 'Politics' },
    panels: ['map', 'live-news', 'politics', 'gov', 'thinktanks', 'insights', 'intel', 'gdelt-intel', 'strategic-posture', 'sanctions-pressure', 'regional-intelligence'],
    layers: ['hotspots', 'conflicts', 'protests', 'sanctions', 'ucdpEvents', 'economic'], timeRange: '48h',
  },
  {
    id: 'technology', label: { hy: 'Տեխնոլոգիաներ', ru: 'Технологии', en: 'Technology' }, shortLabel: { hy: 'Տեխնոլոգիա', ru: 'Технологии', en: 'Technology' },
    panels: ['map', 'live-news', 'insights', 'tech', 'ai', 'security', 'policy', 'hardware', 'cloud', 'tech-readiness', 'defense-patents', 'internet-disruptions', 'service-status', 'startups', 'funding'],
    layers: ['datacenters', 'startupHubs', 'techHQs', 'techEvents', 'cloudRegions', 'cables', 'outages', 'cyberThreats', 'natural'], timeRange: '7d',
  },
  {
    id: 'energy', label: { hy: 'Էներգետիկա', ru: 'Энергетика', en: 'Energy' }, shortLabel: { hy: 'Էներգետիկա', ru: 'Энергетика', en: 'Energy' },
    panels: ['map', 'live-news', 'energy', 'energy-complex', 'pipeline-status', 'storage-facility-map', 'fuel-shortages', 'energy-disruptions', 'energy-risk-overview', 'supply-chain', 'commodities', 'economic'],
    layers: ['pipelines', 'storageFacilities', 'fuelShortages', 'tradeRoutes', 'waterways', 'commodityPorts', 'commodityHubs', 'sanctions', 'fires', 'weather', 'outages', 'natural'], timeRange: '7d', more: true,
  },
  {
    id: 'society', label: { hy: 'Հասարակություն', ru: 'Общество', en: 'Society' }, shortLabel: { hy: 'Հասարակություն', ru: 'Общество', en: 'Society' },
    panels: ['map', 'live-news', 'politics', 'disease-outbreaks', 'displacement', 'climate', 'social-velocity', 'population-exposure', 'consumer-prices'],
    layers: ['protests', 'displacement', 'diseaseOutbreaks', 'climate', 'weather', 'natural'], timeRange: '7d', more: true,
  },
  {
    id: 'emergencies', label: { hy: 'Արտակարգ իրավիճակներ', ru: 'Чрезвычайные ситуации', en: 'Emergencies' }, shortLabel: { hy: 'Արտակարգ', ru: 'ЧС', en: 'Emergencies' },
    panels: ['map', 'live-news', 'insights', 'disaster-correlation', 'satellite-fires', 'disease-outbreaks', 'security-advisories', 'radiation-watch', 'thermal-escalation'],
    layers: ['natural', 'weather', 'fires', 'diseaseOutbreaks', 'radiationWatch', 'outages'], timeRange: '24h', more: true,
  },
  {
    id: 'region', label: { hy: 'Տարածաշրջան և աշխարհ', ru: 'Регион и мир', en: 'Region & World' }, shortLabel: { hy: 'Տարածաշրջան', ru: 'Регион и мир', en: 'Region & World' },
    panels: ['map', 'live-news', 'politics', 'middleeast', 'europe', 'asia', 'us', 'insights', 'gdelt-intel', 'strategic-risk', 'economic-correlation'],
    layers: ['conflicts', 'hotspots', 'protests', 'sanctions', 'economic', 'ucdpEvents', 'outages'], timeRange: '48h', more: true,
  },
] as const;

export const ARMENIA_PRIMARY_SECTIONS = ARMENIA_SECTIONS.filter((section) => !section.more);
export const ARMENIA_MORE_SECTIONS = ARMENIA_SECTIONS.filter((section) => section.more);
export const ARMENIA_LANGUAGE_STORAGE_KEY = 'armenia-signal-language-v1';
export const ARMENIA_SECTION_STORAGE_KEY = 'armenia-signal-section-v1';

export function isArmeniaLanguage(value: unknown): value is ArmeniaLanguage { return value === 'hy' || value === 'ru' || value === 'en'; }
export function isArmeniaSectionId(value: unknown): value is ArmeniaSectionId { return ARMENIA_SECTIONS.some((section) => section.id === value); }
export function getArmeniaSection(id: ArmeniaSectionId): ArmeniaSection { return ARMENIA_SECTIONS.find((section) => section.id === id) ?? ARMENIA_SECTIONS[0]!; }

export function applyArmeniaSectionToState(sectionId: ArmeniaSectionId, currentPanelSettings: Record<string, PanelConfig>, defaultLayers: MapLayers = DEFAULT_MAP_LAYERS): { panelSettings: Record<string, PanelConfig>; panelOrder: string[]; mapLayers: MapLayers } {
  const section = getArmeniaSection(sectionId);
  const selectedPanels = new Set(section.panels);
  const panelSettings: Record<string, PanelConfig> = {};
  const allKeys = new Set([...Object.keys(ALL_PANELS), ...Object.keys(currentPanelSettings)]);
  for (const key of allKeys) {
    const current = currentPanelSettings[key];
    const resolved = ALL_PANELS[key] ? getEffectivePanelConfig(key, 'full') : current;
    if (!resolved) continue;
    if (key.startsWith('cw-') || key.startsWith('mcp-') || key === 'runtime-config') { panelSettings[key] = { ...resolved }; continue; }
    panelSettings[key] = { ...resolved, enabled: key === 'map' || selectedPanels.has(key) };
  }
  const candidateLayers = { ...defaultLayers };
  for (const key of Object.keys(candidateLayers) as Array<keyof MapLayers>) candidateLayers[key] = section.layers.includes(key);
  return { panelSettings, panelOrder: section.panels.filter((key) => key !== 'map'), mapLayers: sanitizeLayersForVariant(candidateLayers, 'full') };
}
