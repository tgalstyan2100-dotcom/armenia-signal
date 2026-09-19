import type { MapLayers } from '@/types';
import { safeStorageGet } from '@/utils/safe-storage';

export type ArmeniaMapLanguage = 'hy' | 'ru' | 'en';
export type ArmeniaMapTimeRange = '1h' | '6h' | '24h' | '48h' | '7d' | 'all';

const LANGUAGE_STORAGE_KEY = 'armenia-signal-language-v1';

const UI = {
  hy: {
    layers: 'ՇԵՐՏԵՐ', searchLayers: 'Որոնել շերտեր…', timeRange: 'ԺԱՄԱՆԱԿԱՀԱՏՎԱԾ',
    zoomIn: 'Մեծացնել', zoomOut: 'Փոքրացնել', resetView: 'Վերականգնել տեսքը',
    selectRegion: 'Ընտրել տարածաշրջանը', explain: 'Բացատրել շերտը',
    views: { global: 'Աշխարհ', america: 'Հյուսիսային Ամերիկա', mena: 'Մերձավոր Արևելք', eu: 'Եվրոպա', asia: 'Ասիա', latam: 'Լատինական Ամերիկա', africa: 'Աֆրիկա', oceania: 'Օվկիանիա' },
    ranges: { '1h': '1ժ', '6h': '6ժ', '24h': '24ժ', '48h': '48ժ', '7d': '7օր', all: 'Բոլորը' },
  },
  ru: {
    layers: 'СЛОИ', searchLayers: 'Поиск слоёв…', timeRange: 'ПЕРИОД',
    zoomIn: 'Приблизить', zoomOut: 'Отдалить', resetView: 'Сбросить вид',
    selectRegion: 'Выбрать регион', explain: 'Объяснить слой',
    views: { global: 'Мир', america: 'Северная Америка', mena: 'Ближний Восток', eu: 'Европа', asia: 'Азия', latam: 'Латинская Америка', africa: 'Африка', oceania: 'Океания' },
    ranges: { '1h': '1ч', '6h': '6ч', '24h': '24ч', '48h': '48ч', '7d': '7д', all: 'Все' },
  },
  en: {
    layers: 'LAYERS', searchLayers: 'Search layers…', timeRange: 'TIME RANGE',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', resetView: 'Reset view',
    selectRegion: 'Select region', explain: 'Explain layer',
    views: { global: 'Global', america: 'North America', mena: 'Middle East', eu: 'Europe', asia: 'Asia', latam: 'Latin America', africa: 'Africa', oceania: 'Oceania' },
    ranges: { '1h': '1H', '6h': '6H', '24h': '24H', '48h': '48H', '7d': '7D', all: 'ALL' },
  },
} as const;

const LAYER_LABELS: Record<ArmeniaMapLanguage, Partial<Record<keyof MapLayers, string>>> = {
  hy: {
    iranAttacks: 'Իրանի հարվածներ', hotspots: 'Թեժ կետեր', conflicts: 'Հակամարտության գոտիներ',
    bases: 'Ռազմական բազաներ', nuclear: 'Միջուկային օբյեկտներ', irradiators: 'Գամմա ճառագայթիչներ',
    radiationWatch: 'Ճառագայթային հսկողություն', spaceports: 'Տիեզերակայաններ', satellites: 'Արբանյակներ',
    cables: 'Ստորջրյա մալուխներ', pipelines: 'Խողովակաշարեր', datacenters: 'Տվյալների կենտրոններ',
    military: 'Ռազմական ակտիվություն', ais: 'Նավերի երթևեկություն', tradeRoutes: 'Առևտրային ուղիներ',
    flights: 'Ավիացիա', protests: 'Բողոքի ակցիաներ', ucdpEvents: 'Զինված բախումների դեպքեր',
    displacement: 'Տեղահանման հոսքեր', climate: 'Կլիմայական շեղումներ', weather: 'Եղանակային վտանգներ',
    canadaRoads: 'Կանադայի ճանապարհներ', canadaAlerts: 'Կանադայի ահազանգեր', outages: 'Կապի խափանումներ',
    cyberThreats: 'Կիբեռսպառնալիքներ', natural: 'Բնական աղետներ', fires: 'Հրդեհներ', waterways: 'Ռազմավարական ջրուղիներ',
    economic: 'Տնտեսական կենտրոններ', minerals: 'Կրիտիկական հանքանյութեր', gpsJamming: 'GPS խափանումներ',
    ciiChoropleth: 'Կրիտիկական ենթակառուցվածքի ռիսկ', resilienceScore: 'Դիմակայունության գնահատական', dayNight: 'Օր և գիշեր',
    sanctions: 'Պատժամիջոցներ', startupHubs: 'Ստարտափ կենտրոններ', techHQs: 'Տեխնոլոգիական կենտրոնակայաններ',
    accelerators: 'Աքսելերատորներ', cloudRegions: 'Ամպային տարածաշրջաններ', techEvents: 'Տեխնոլոգիական միջոցառումներ',
    stockExchanges: 'Ֆոնդային բորսաներ', financialCenters: 'Ֆինանսական կենտրոններ', centralBanks: 'Կենտրոնական բանկեր',
    commodityHubs: 'Ապրանքային հանգույցներ', gulfInvestments: 'Ծոցի ներդրումներ', positiveEvents: 'Դրական իրադարձություններ',
    kindness: 'Բարի գործեր', happiness: 'Երջանկություն', speciesRecovery: 'Տեսակների վերականգնում',
    renewableInstallations: 'Վերականգնվող էներգիա', miningSites: 'Հանքավայրեր', processingPlants: 'Վերամշակման գործարաններ',
    commodityPorts: 'Ապրանքային նավահանգիստներ', webcams: 'Տեսախցիկներ', diseaseOutbreaks: 'Հիվանդությունների բռնկումներ',
    storageFacilities: 'Պահեստարաններ', fuelShortages: 'Վառելիքի պակաս', liveTankers: 'Լցանավեր ուղիղ եթերում',
  },
  ru: {
    iranAttacks: 'Удары Ирана', hotspots: 'Горячие точки', conflicts: 'Зоны конфликтов', bases: 'Военные базы',
    nuclear: 'Ядерные объекты', irradiators: 'Гамма-облучатели', radiationWatch: 'Радиационный контроль',
    spaceports: 'Космодромы', satellites: 'Спутники', cables: 'Подводные кабели', pipelines: 'Трубопроводы',
    datacenters: 'Центры обработки данных', military: 'Военная активность', ais: 'Движение судов',
    tradeRoutes: 'Торговые маршруты', flights: 'Авиация', protests: 'Протесты', ucdpEvents: 'Вооружённые столкновения',
    displacement: 'Потоки перемещений', climate: 'Климатические аномалии', weather: 'Погодные угрозы',
    canadaRoads: 'Дороги Канады', canadaAlerts: 'Оповещения Канады', outages: 'Сбои связи',
    cyberThreats: 'Киберугрозы', natural: 'Стихийные бедствия', fires: 'Пожары',
    waterways: 'Стратегические водные пути', economic: 'Экономические центры', minerals: 'Критические минералы',
    gpsJamming: 'Помехи GPS', ciiChoropleth: 'Риск критической инфраструктуры', resilienceScore: 'Оценка устойчивости',
    dayNight: 'День и ночь', sanctions: 'Санкции', startupHubs: 'Стартап-хабы', techHQs: 'Штаб-квартиры техкомпаний',
    accelerators: 'Акселераторы', cloudRegions: 'Облачные регионы', techEvents: 'Технологические события',
    stockExchanges: 'Фондовые биржи', financialCenters: 'Финансовые центры', centralBanks: 'Центральные банки',
    commodityHubs: 'Товарные хабы', gulfInvestments: 'Инвестиции стран Залива', positiveEvents: 'Позитивные события',
    kindness: 'Добрые дела', happiness: 'Счастье', speciesRecovery: 'Восстановление видов', renewableInstallations: 'Возобновляемая энергетика',
    miningSites: 'Месторождения', processingPlants: 'Перерабатывающие заводы', commodityPorts: 'Товарные порты',
    webcams: 'Веб-камеры', diseaseOutbreaks: 'Вспышки заболеваний', storageFacilities: 'Хранилища',
    fuelShortages: 'Дефицит топлива', liveTankers: 'Танкеры онлайн',
  },
  en: {
    iranAttacks: 'Iran attacks', hotspots: 'Intel hotspots', conflicts: 'Conflict zones', bases: 'Military bases',
    nuclear: 'Nuclear sites', irradiators: 'Gamma irradiators', radiationWatch: 'Radiation watch', spaceports: 'Spaceports',
    satellites: 'Satellites', cables: 'Undersea cables', pipelines: 'Pipelines', datacenters: 'Data centers',
    military: 'Military activity', ais: 'Ship traffic', tradeRoutes: 'Trade routes', flights: 'Aviation', protests: 'Protests',
    ucdpEvents: 'Armed conflict events', displacement: 'Displacement flows', climate: 'Climate anomalies', weather: 'Weather alerts',
    canadaRoads: 'Canada roads', canadaAlerts: 'Canada alerts', outages: 'Internet outages', cyberThreats: 'Cyber threats',
    natural: 'Natural events', fires: 'Wildfires', waterways: 'Strategic waterways', economic: 'Economic centers',
    minerals: 'Critical minerals', gpsJamming: 'GPS jamming', ciiChoropleth: 'Critical infrastructure risk',
    resilienceScore: 'Resilience score', dayNight: 'Day and night', sanctions: 'Sanctions', startupHubs: 'Startup hubs',
    techHQs: 'Tech headquarters', accelerators: 'Accelerators', cloudRegions: 'Cloud regions', techEvents: 'Tech events',
    stockExchanges: 'Stock exchanges', financialCenters: 'Financial centers', centralBanks: 'Central banks',
    commodityHubs: 'Commodity hubs', gulfInvestments: 'Gulf investments', positiveEvents: 'Positive events', kindness: 'Kindness',
    happiness: 'Happiness', speciesRecovery: 'Species recovery', renewableInstallations: 'Renewable installations',
    miningSites: 'Mining sites', processingPlants: 'Processing plants', commodityPorts: 'Commodity ports', webcams: 'Webcams',
    diseaseOutbreaks: 'Disease outbreaks', storageFacilities: 'Storage facilities', fuelShortages: 'Fuel shortages',
    liveTankers: 'Live tankers',
  },
};

export function getArmeniaMapLanguage(): ArmeniaMapLanguage {
  const stored = safeStorageGet(LANGUAGE_STORAGE_KEY);
  if (!stored) return 'hy';
  try {
    const value = JSON.parse(stored) as unknown;
    return value === 'hy' || value === 'ru' || value === 'en' ? value : 'hy';
  } catch {
    return 'hy';
  }
}

export function getArmeniaMapUi(language = getArmeniaMapLanguage()) { return UI[language]; }

export function getArmeniaMapLayerLabel(layer: keyof MapLayers, fallback: string, language = getArmeniaMapLanguage()): string {
  return LAYER_LABELS[language][layer] ?? fallback;
}

export function localizeArmeniaMapControls(root: ParentNode = document, language = getArmeniaMapLanguage()): void {
  const ui = UI[language];
  root.querySelectorAll<HTMLElement>('.toggle-header > span').forEach((element) => { element.textContent = ui.layers; });
  root.querySelectorAll<HTMLInputElement>('.layer-search').forEach((element) => { element.placeholder = ui.searchLayers; });
  root.querySelectorAll<HTMLElement>('.time-slider-label').forEach((element) => { element.textContent = ui.timeRange; });
  root.querySelectorAll<HTMLElement>('.time-btn[data-range]').forEach((element) => {
    const range = element.dataset.range as ArmeniaMapTimeRange;
    if (ui.ranges[range]) element.textContent = ui.ranges[range];
  });
  const controlLabels = { 'zoom-in': ui.zoomIn, 'zoom-out': ui.zoomOut, reset: ui.resetView, 'zoom-reset': ui.resetView } as const;
  root.querySelectorAll<HTMLElement>('.map-control-btn[data-action], .map-btn').forEach((element) => {
    const action = element.dataset.action ?? [...element.classList].find((name) => name in controlLabels);
    const label = action ? controlLabels[action as keyof typeof controlLabels] : undefined;
    if (label) { element.title = label; element.setAttribute('aria-label', label); }
  });
  root.querySelectorAll<HTMLSelectElement>('.view-select').forEach((select) => {
    select.setAttribute('aria-label', ui.selectRegion);
    for (const option of Array.from(select.options)) {
      const label = ui.views[option.value as keyof typeof ui.views];
      if (label) option.textContent = label;
    }
  });
  root.querySelectorAll<HTMLElement>('.layer-toggle-row[data-layer]').forEach((row) => {
    const layer = row.dataset.layer as keyof MapLayers;
    const target = row.querySelector<HTMLElement>('.toggle-label') ?? row.querySelector<HTMLElement>('.layer-toggle');
    if (!target) return;
    const fallback = target.dataset.defaultLabel ?? target.textContent?.replace(/\s*🔒\s*$/, '').trim() ?? String(layer);
    target.dataset.defaultLabel = fallback;
    const label = getArmeniaMapLayerLabel(layer, fallback, language);
    const proBadge = target.querySelector<HTMLElement>('.layer-pro-badge')?.cloneNode(true) as HTMLElement | undefined;
    const locked = target.closest('.layer-toggle')?.classList.contains('layer-toggle-locked');
    target.replaceChildren(document.createTextNode(`${label}${locked ? ' 🔒' : ''}`));
    if (proBadge) target.append(' ', proBadge);
    const explain = row.querySelector<HTMLElement>('.layer-explain-btn');
    if (explain) { const text = `${ui.explain}: ${label}`; explain.title = text; explain.setAttribute('aria-label', text); }
  });
}
