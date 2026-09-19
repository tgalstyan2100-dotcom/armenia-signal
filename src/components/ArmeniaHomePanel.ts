import '@/styles/armenia-signal.css';
import { Panel } from './Panel';
import {
  ARMENIA_LANGUAGE_STORAGE_KEY,
  ARMENIA_SECTION_STORAGE_KEY,
  getArmeniaSection,
  isArmeniaLanguage,
  isArmeniaSectionId,
  type ArmeniaLanguage,
  type ArmeniaSectionId,
} from '@/config/armenia-sections';
import {
  filterArmeniaSignalsForSection,
  type ArmeniaRankedSignal,
  type ArmeniaRelevanceReason,
  type ArmeniaSignalCategory,
} from '@/config/armenia-home';
import { ARMENIA_NEWS_SOURCE_NAMES } from '@/config/armenia-feeds';
import { fetchArmeniaContent } from '@/services/armenia-news';
import { fetchArmeniaIndicators } from '@/services/armenia-indicators';
import {
  installArmeniaShell,
  readArmeniaScope,
  type ArmeniaScopeFilter,
} from '@/services/armenia-shell';
import type { ArmeniaContentSignal, ArmeniaSourceHealth } from '@/types/armenia-signal';
import type {
  ArmeniaIndicator,
  ArmeniaIndicatorId,
  ArmeniaIndicatorSnapshot,
} from '@/types/armenia-indicators';
import type { NewsItem } from '@/types';
import { h } from '@/utils/dom-utils';
import { sanitizeUrl } from '@/utils/sanitize';
import { safeStorageGet } from '@/utils/safe-storage';

type Copy = {
  panelTitle: string;
  eyebrow: string;
  title: string;
  description: string;
  signals: string;
  highImpact: string;
  urgent: string;
  lead: string;
  economy: string;
  security: string;
  technology: string;
  region: string;
  empty: string;
  emptyDetail: string;
  source: string;
  direct: string;
  regional: string;
  external: string;
  focusDescription: string;
  focusList: string;
  localSources: string;
  activeSources: string;
  sourceDetails: string;
  keyIndicators: string;
  macro: string;
  bankingFx: string;
  market: string;
  energy: string;
  technologyPulse: string;
  technologyPulseDescription: string;
  sourceHealth: string;
  updated: string;
  impact: string;
  corroborating: string;
  unverifiedDate: string;
  unavailable: string;
  reason: Record<ArmeniaRelevanceReason, string>;
  indicatorLabels: Record<ArmeniaIndicatorId, string>;
  indicatorNotes: Partial<Record<ArmeniaIndicatorId, string>>;
};

const COPY: Record<ArmeniaLanguage, Copy> = {
  hy: {
    panelTitle: 'ՀԱՅԱՍՏԱՆ․ ՈՒՂԻՂ ԱԶԴԱԿՆԵՐ', eyebrow: 'ARMENIA / LIVE SIGNALS', title: 'Կարևորը՝ որոշումների համար',
    description: 'Հայաստանին ուղղակի կամ նյութականորեն ազդող ազդակներ և պաշտոնական ցուցանիշներ՝ առանց գլոբալ աղմուկի։',
    signals: 'Ազդակներ', highImpact: 'Բարձր ազդեցություն', urgent: 'Շտապ', lead: 'Գլխավոր ազդակ',
    economy: 'Տնտեսություն և շուկաներ', security: 'Անվտանգություն և դիվանագիտություն', technology: 'Տեխնոլոգիաներ',
    region: 'Տարածաշրջանային այլ ազդակներ', empty: 'Այս բաժնում Հայաստանի վերաբերյալ հաստատված ազդակ դեռ չկա։',
    emptyDetail: 'Բլոկը չենք լրացնում պատահական կամ հին ինդեքսավորված էջերով։', source: 'Բացել աղբյուրը',
    direct: 'Հայաստան', regional: 'Տարածաշրջան', external: 'Արտաքին ազդեցություն',
    focusDescription: 'Միայն այս բաժնին վերաբերող և Հայաստանի վրա ազդեցություն ունեցող ազդակներ։', focusList: 'Վերջին ազդակներ',
    localSources: 'Հայկական աղբյուրներ', activeSources: 'ակտիվ', sourceDetails: 'Աղբյուրների վիճակը',
    keyIndicators: 'Հայաստան․ հիմնական ցուցանիշներ', macro: 'Մակրոտնտեսություն', bankingFx: 'Բանկային համակարգ և փոխարժեք',
    market: 'Կապիտալի շուկա', energy: 'Էներգետիկա', technologyPulse: 'Տեխնոլոգիական պուլս',
    technologyPulseDescription: 'ԲՏ, AI, թվային ենթակառուցվածք և կիբեռանվտանգություն՝ հայկական աղբյուրներից։',
    sourceHealth: 'Տվյալների աղբյուրներ', updated: 'թարմացվել է', impact: 'Ազդեցություն', corroborating: 'աղբյուր',
    unverifiedDate: 'ամսաթիվը՝ հայտնաբերման', unavailable: 'Տվյալը ժամանակավորապես հասանելի չէ',
    reason: { 'armenia-mention': 'Հայաստանի ուղղակի հիշատակում', 'armenia-location': 'Հայաստանի տարածք', 'armenia-source': 'Հայկական սկզբնաղբյուր', 'south-caucasus': 'Հարավային Կովկաս', 'core-neighbor': 'Հարևան երկրից նյութական ազդեցություն', 'external-impact': 'Արտաքին ազդեցություն Հայաստանի վրա' },
    indicatorLabels: {
      'usd-amd': 'USD/AMD', 'eur-amd': 'EUR/AMD', 'rub-amd': 'RUB/AMD', 'policy-rate': 'ԿԲ տոկոսադրույք',
      'annual-inflation': 'Տարեկան գնաճ', 'credit-gdp-gap': 'Վարկ/GDP ճեղք', 'countercyclical-buffer': 'Հակացիկլիկ բուֆեր',
      'economic-activity-yoy': 'Տնտեսական ակտիվություն', 'cpi-yoy': 'ՍԳԻ փոփոխություն', 'amx-corporate-bond-index': 'AMX պարտատոմսերի ինդեքս',
      'electricity-tariff-status': 'Էլեկտրաէներգիայի սակագին',
    },
    indicatorNotes: { 'electricity-tariff-status': '2026-ին՝ անփոփոխ' },
  },
  ru: {
    panelTitle: 'АРМЕНИЯ: ЖИВЫЕ СИГНАЛЫ', eyebrow: 'ARMENIA / LIVE SIGNALS', title: 'Главное для решений',
    description: 'Сигналы с прямым или существенным влиянием на Армению и официальные показатели без глобального шума.',
    signals: 'Сигналы', highImpact: 'Высокое влияние', urgent: 'Срочные', lead: 'Главный сигнал', economy: 'Экономика и рынки',
    security: 'Безопасность и дипломатия', technology: 'Технологии', region: 'Другие региональные сигналы',
    empty: 'В этом разделе пока нет подтверждённых сигналов по Армении.', emptyDetail: 'Мы не заполняем блок случайными или переиндексированными старыми страницами.',
    source: 'Открыть источник', direct: 'Армения', regional: 'Регион', external: 'Внешнее влияние',
    focusDescription: 'Только сигналы этого раздела, способные повлиять на Армению.', focusList: 'Последние сигналы',
    localSources: 'Армянские источники', activeSources: 'активны', sourceDetails: 'Состояние источников', keyIndicators: 'Армения: ключевые показатели',
    macro: 'Макроэкономика', bankingFx: 'Банки и валютный рынок', market: 'Рынок капитала', energy: 'Энергетика', technologyPulse: 'Технологический пульс',
    technologyPulseDescription: 'ИТ, AI, цифровая инфраструктура и кибербезопасность из армянских источников.', sourceHealth: 'Источники данных',
    updated: 'обновлено', impact: 'Влияние', corroborating: 'источн.', unverifiedDate: 'дата обнаружения', unavailable: 'Данные временно недоступны',
    reason: { 'armenia-mention': 'Прямое упоминание Армении', 'armenia-location': 'Территория Армении', 'armenia-source': 'Армянский первоисточник', 'south-caucasus': 'Южный Кавказ', 'core-neighbor': 'Влияние соседней страны', 'external-impact': 'Внешнее влияние на Армению' },
    indicatorLabels: {
      'usd-amd': 'USD/AMD', 'eur-amd': 'EUR/AMD', 'rub-amd': 'RUB/AMD', 'policy-rate': 'Ставка ЦБ', 'annual-inflation': 'Годовая инфляция',
      'credit-gdp-gap': 'Разрыв кредит/ВВП', 'countercyclical-buffer': 'Контрциклический буфер', 'economic-activity-yoy': 'Экономическая активность',
      'cpi-yoy': 'Изменение ИПЦ', 'amx-corporate-bond-index': 'Индекс облигаций AMX', 'electricity-tariff-status': 'Тариф на электроэнергию',
    },
    indicatorNotes: { 'electricity-tariff-status': 'в 2026 году без изменений' },
  },
  en: {
    panelTitle: 'ARMENIA LIVE SIGNALS', eyebrow: 'ARMENIA / LIVE SIGNALS', title: 'What matters for decisions',
    description: 'Signals with direct or material impact on Armenia plus official indicators, without global noise.',
    signals: 'Signals', highImpact: 'High impact', urgent: 'Urgent', lead: 'Lead signal', economy: 'Economy & markets', security: 'Security & diplomacy',
    technology: 'Technology', region: 'Other regional signals', empty: 'No verified Armenia-relevant signal in this section yet.',
    emptyDetail: 'We do not fill this space with unrelated or re-indexed old pages.', source: 'Open source', direct: 'Armenia', regional: 'Region', external: 'External impact',
    focusDescription: 'Only signals in this section with material impact on Armenia.', focusList: 'Latest signals', localSources: 'Armenian sources',
    activeSources: 'active', sourceDetails: 'Source status', keyIndicators: 'Armenia: key indicators', macro: 'Macroeconomy', bankingFx: 'Banking & FX', market: 'Capital market',
    energy: 'Energy', technologyPulse: 'Technology pulse', technologyPulseDescription: 'IT, AI, digital infrastructure and cybersecurity from Armenian sources.',
    sourceHealth: 'Data sources', updated: 'updated', impact: 'Impact', corroborating: 'sources', unverifiedDate: 'discovery date', unavailable: 'Data temporarily unavailable',
    reason: { 'armenia-mention': 'Direct Armenia mention', 'armenia-location': 'Located in Armenia', 'armenia-source': 'Armenian primary source', 'south-caucasus': 'South Caucasus impact', 'core-neighbor': 'Neighbor-country impact', 'external-impact': 'External impact on Armenia' },
    indicatorLabels: {
      'usd-amd': 'USD/AMD', 'eur-amd': 'EUR/AMD', 'rub-amd': 'RUB/AMD', 'policy-rate': 'CBA policy rate', 'annual-inflation': 'Annual inflation',
      'credit-gdp-gap': 'Credit/GDP gap', 'countercyclical-buffer': 'Countercyclical buffer', 'economic-activity-yoy': 'Economic activity',
      'cpi-yoy': 'CPI change', 'amx-corporate-bond-index': 'AMX bond index', 'electricity-tariff-status': 'Electricity tariff',
    },
    indicatorNotes: { 'electricity-tariff-status': 'unchanged in 2026' },
  },
};

const LANE_CATEGORIES: Record<'economy' | 'security' | 'technology' | 'region', ArmeniaSignalCategory[]> = {
  economy: ['economy', 'energy'], security: ['security', 'politics'], technology: ['technology'], region: ['society', 'region'],
};

const HOME_INDICATORS: ArmeniaIndicatorId[] = ['usd-amd', 'eur-amd', 'policy-rate', 'annual-inflation', 'economic-activity-yoy', 'amx-corporate-bond-index'];
const ECONOMY_INDICATORS: ArmeniaIndicatorId[] = ['usd-amd', 'eur-amd', 'rub-amd', 'policy-rate', 'annual-inflation', 'economic-activity-yoy', 'cpi-yoy', 'credit-gdp-gap', 'countercyclical-buffer', 'amx-corporate-bond-index'];
const ENERGY_INDICATORS: ArmeniaIndicatorId[] = ['electricity-tariff-status'];

function readLanguage(): ArmeniaLanguage {
  const stored = safeStorageGet(ARMENIA_LANGUAGE_STORAGE_KEY);
  if (!stored) return 'hy';
  try { const parsed = JSON.parse(stored) as unknown; return isArmeniaLanguage(parsed) ? parsed : 'hy'; } catch { return 'hy'; }
}

function readSection(): ArmeniaSectionId {
  const stored = safeStorageGet(ARMENIA_SECTION_STORAGE_KEY);
  if (!stored) return 'home';
  try { const parsed = JSON.parse(stored) as unknown; return isArmeniaSectionId(parsed) ? parsed : 'home'; } catch { return 'home'; }
}

function relativeTime(date: Date, language: ArmeniaLanguage): string {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  const locale = language === 'hy' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US';
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (minutes < 60) return formatter.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 48) return formatter.format(-hours, 'hour');
  return formatter.format(-Math.round(hours / 24), 'day');
}

function indicatorValue(indicator: ArmeniaIndicator, language: ArmeniaLanguage): string {
  if (indicator.id === 'electricity-tariff-status' && indicator.value === 'unchanged') {
    return language === 'hy' ? 'Անփոփոխ' : language === 'ru' ? 'Без изменений' : 'Unchanged';
  }
  if (typeof indicator.value === 'string') return indicator.value;
  const locale = language === 'hy' ? 'hy-AM' : language === 'ru' ? 'ru-RU' : 'en-US';
  const digits = indicator.unit === 'AMD' ? 4 : indicator.unit === 'index' ? 4 : 1;
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(indicator.value);
  if (indicator.unit === '%') return `${formatted}%`;
  if (indicator.unit === 'AMD') return `${formatted} ֏`;
  return formatted;
}

export class ArmeniaHomePanel extends Panel {
  private language: ArmeniaLanguage = readLanguage();
  private section: ArmeniaSectionId = readSection();
  private scope: ArmeniaScopeFilter = readArmeniaScope();
  private ranked: ArmeniaRankedSignal[] = [];
  private rawByUrl = new Map<string, ArmeniaContentSignal>();
  private sourceHealth = new Map<string, ArmeniaSourceHealth>();
  private indicators: ArmeniaIndicatorSnapshot | null = null;
  private contentLoad: Promise<void> | null = null;
  private indicatorLoad: Promise<void> | null = null;

  private readonly languageHandler = (event: Event) => {
    const language = (event as CustomEvent<{ language?: unknown }>).detail?.language;
    if (!isArmeniaLanguage(language)) return;
    this.language = language;
    installArmeniaShell(language);
    this.render();
    void this.refreshContent(true);
  };

  private readonly sectionHandler = (event: Event) => {
    const sectionId = (event as CustomEvent<{ sectionId?: unknown }>).detail?.sectionId;
    if (!isArmeniaSectionId(sectionId)) return;
    this.section = sectionId;
    this.render();
  };

  private readonly scopeHandler = (event: Event) => {
    const scope = (event as CustomEvent<{ scope?: unknown }>).detail?.scope;
    if (scope !== 'armenia' && scope !== 'south-caucasus' && scope !== 'external-impact') return;
    this.scope = scope;
    this.render();
  };

  constructor() {
    super({ id: 'armenia-home', title: COPY[readLanguage()].panelTitle, showCount: true, className: 'armenia-home-panel', defaultRowSpan: 2 });
    this.getElement().classList.add('panel-wide');
    installArmeniaShell(this.language);
    window.addEventListener('armenia:language-change', this.languageHandler);
    window.addEventListener('armenia:section-change', this.sectionHandler);
    window.addEventListener('armenia:scope-change', this.scopeHandler);
    this.render();
    void this.refreshContent();
    void this.refreshIndicators();
  }

  public updateNews(_items: NewsItem[]): void { void this.refreshContent(); }
  public hasData(): boolean { return this.ranked.length > 0 || Boolean(this.indicators?.indicators.length); }

  private async refreshContent(force = false): Promise<void> {
    if (this.contentLoad && !force) return this.contentLoad;
    const load = fetchArmeniaContent(this.language, force)
      .then((snapshot) => {
        // Ignore a slower response from a previously selected language.
        if (snapshot.language !== this.language) return;
        this.ranked = snapshot.signals;
        this.rawByUrl = new Map(snapshot.rawSignals.map((signal) => [signal.url, signal]));
        this.sourceHealth = new Map(snapshot.sources.map((source) => [source.sourceName, source]));
        const urgent = this.ranked.some((signal) => signal.item.isAlert);
        this.setSeverity(urgent ? 'high' : this.ranked.length > 0 ? 'low' : 'none');
        this.render();
      })
      .catch((error) => {
        console.warn('[Armenia Signal] Content API unavailable:', error);
        if (this.ranked.length === 0) { this.setSeverity('none'); this.render(); }
      })
      .finally(() => { if (this.contentLoad === load) this.contentLoad = null; });
    this.contentLoad = load;
    return load;
  }

  private async refreshIndicators(force = false): Promise<void> {
    if (this.indicatorLoad && !force) return this.indicatorLoad;
    const load = fetchArmeniaIndicators(force)
      .then((snapshot) => { this.indicators = snapshot; this.render(); })
      .catch((error) => { console.warn('[Armenia Signal] Indicator API unavailable:', error); })
      .finally(() => { if (this.indicatorLoad === load) this.indicatorLoad = null; });
    this.indicatorLoad = load;
    return load;
  }

  private scopedSignals(): ArmeniaRankedSignal[] {
    const base = this.section === 'region'
      ? this.ranked.filter((signal) => signal.scope !== 'armenia')
      : this.ranked.filter((signal) => {
        if (this.scope === 'armenia') return signal.scope === 'armenia';
        if (this.scope === 'south-caucasus') return signal.scope === 'region';
        return signal.scope === 'world-impact';
      });
    return filterArmeniaSignalsForSection(base, this.section);
  }

  private render(): void {
    const copy = COPY[this.language];
    const visibleSignals = this.scopedSignals();
    const sectionLabel = getArmeniaSection(this.section).label[this.language];
    const focused = !['home', 'map', 'region'].includes(this.section);
    this.getElement().classList.toggle('armenia-home-panel--focused', focused);
    const title = this.getElement().querySelector<HTMLElement>('.panel-title');
    if (title) title.textContent = focused ? `${sectionLabel} · ${copy.signals}` : copy.panelTitle;
    this.setCount(visibleSignals.length);
    this.setDataBadge(visibleSignals.length > 0 || Boolean(this.indicators?.indicators.length) ? 'live' : 'unavailable');

    const highImpactCount = visibleSignals.filter((signal) => signal.score >= 65).length;
    const urgentCount = visibleSignals.filter((signal) => signal.item.isAlert).length;
    const activeSourceCount = ARMENIA_NEWS_SOURCE_NAMES.filter((sourceName) => {
      const health = this.sourceHealth.get(sourceName);
      return health && health.state !== 'unavailable' && health.itemCount > 0;
    }).length;

    const body: HTMLElement[] = [
      h('section', { className: 'armenia-home__masthead' },
        h('div', { className: 'armenia-home__identity' },
          h('span', { className: 'armenia-home__eyebrow' }, focused ? `${sectionLabel} / LIVE` : copy.eyebrow),
          h('strong', { className: 'armenia-home__title' }, focused ? sectionLabel : copy.title),
          h('span', { className: 'armenia-home__description' }, focused ? copy.focusDescription : copy.description),
        ),
        h('div', { className: 'armenia-home__metrics' },
          this.metric(String(visibleSignals.length), copy.signals, 'signal'),
          this.metric(String(highImpactCount), copy.highImpact, 'economy'),
          this.metric(String(urgentCount), copy.urgent, urgentCount > 0 ? 'urgent' : 'calm'),
        ),
      ),
    ];

    if (this.section === 'home' || this.section === 'map') body.push(this.renderIndicatorBoard(copy, HOME_INDICATORS));
    if (this.section === 'economy') body.push(this.renderIndicatorBoard(copy, ECONOMY_INDICATORS));
    if (this.section === 'energy') body.push(this.renderIndicatorBoard(copy, ENERGY_INDICATORS));
    if (this.section === 'technology') body.push(this.renderTechnologyPulse(copy, visibleSignals));

    body.push(this.renderSourceHealth(copy, activeSourceCount));

    if (visibleSignals.length === 0) {
      body.push(h('div', { className: 'armenia-home__empty' },
        h('span', { className: 'armenia-home__empty-mark', 'aria-hidden': 'true' }, 'ԱՄ'),
        h('strong', null, copy.empty),
        h('span', null, copy.emptyDetail),
      ));
    } else if (focused) {
      body.push(this.renderFocusedDashboard(copy, visibleSignals));
    } else {
      body.push(this.renderDashboard(copy, visibleSignals));
    }

    this.setContentNodes(h('div', { className: 'armenia-home' }, ...body));
  }

  private metric(value: string, label: string, tone: string): HTMLElement {
    return h('div', { className: `armenia-home__metric armenia-home__metric--${tone}` }, h('strong', null, value), h('span', null, label));
  }

  private renderIndicatorBoard(copy: Copy, ids: readonly ArmeniaIndicatorId[]): HTMLElement {
    const byId = new Map((this.indicators?.indicators ?? []).map((indicator) => [indicator.id, indicator]));
    const cards = ids.map((id) => this.indicatorCard(id, byId.get(id), copy));
    const healthy = this.indicators?.sources.filter((source) => source.state === 'healthy').length ?? 0;
    const total = this.indicators?.sources.length ?? 4;
    return h('section', { className: 'armenia-indicators' },
      h('div', { className: 'armenia-indicators__heading' },
        h('div', null, h('span', { className: 'armenia-home__section-label' }, copy.keyIndicators), h('strong', null, this.indicatorSectionTitle(copy))),
        h('span', { className: 'armenia-indicators__health' }, `${copy.sourceHealth}: ${healthy}/${total}`),
      ),
      h('div', { className: 'armenia-indicators__grid' }, ...cards),
      h('div', { className: 'armenia-indicators__sources' },
        ...(this.indicators?.sources ?? []).map((source) => h('span', {
          className: `armenia-indicators__source armenia-indicators__source--${source.state}`,
          title: source.state,
        }, source.sourceName, h('small', null, String(source.itemCount)))),
      ),
    );
  }

  private indicatorSectionTitle(copy: Copy): string {
    if (this.section === 'economy') return copy.bankingFx;
    if (this.section === 'energy') return copy.energy;
    return copy.macro;
  }

  private indicatorCard(id: ArmeniaIndicatorId, indicator: ArmeniaIndicator | undefined, copy: Copy): HTMLElement {
    if (!indicator) {
      return h('article', { className: 'armenia-indicator armenia-indicator--unavailable' },
        h('span', { className: 'armenia-indicator__label' }, copy.indicatorLabels[id]),
        h('strong', { className: 'armenia-indicator__value' }, '—'),
        h('small', null, copy.unavailable),
      );
    }
    const change = indicator.change == null ? '' : `${indicator.change > 0 ? '+' : ''}${indicator.change}${indicator.changeUnit === 'percent' ? '%' : ''}`;
    const href = sanitizeUrl(indicator.sourceUrl);
    const contents = [
      h('span', { className: 'armenia-indicator__label' }, copy.indicatorLabels[id]),
      h('div', { className: 'armenia-indicator__value-row' }, h('strong', { className: 'armenia-indicator__value' }, indicatorValue(indicator, this.language)), change ? h('span', { className: 'armenia-indicator__change' }, change) : null),
      h('small', null, copy.indicatorNotes[id] ?? indicator.period ?? indicator.sourceName),
    ];
    return href
      ? h('a', { className: 'armenia-indicator', href, target: '_blank', rel: 'noopener noreferrer', title: copy.source }, ...contents)
      : h('article', { className: 'armenia-indicator' }, ...contents);
  }

  private renderTechnologyPulse(copy: Copy, signals: ArmeniaRankedSignal[]): HTMLElement {
    const tech = signals.filter((signal) => signal.tags.includes('technology'));
    const officialTechSources = ['Ministry of High-Tech Industry and Artificial Intelligence of Armenia', 'Enterprise Incubator Foundation'];
    const active = officialTechSources.filter((name) => this.sourceHealth.get(name)?.state !== 'unavailable').length;
    return h('section', { className: 'armenia-tech-pulse' },
      h('div', { className: 'armenia-tech-pulse__copy' },
        h('span', { className: 'armenia-home__section-label' }, copy.technologyPulse),
        h('strong', null, copy.technologyPulseDescription),
      ),
      h('div', { className: 'armenia-tech-pulse__stats' },
        this.metric(String(tech.length), copy.signals, 'signal'),
        this.metric(String(tech.filter((signal) => signal.score >= 65).length), copy.highImpact, 'economy'),
        this.metric(`${active}/${officialTechSources.length}`, copy.activeSources, 'calm'),
      ),
    );
  }

  private renderSourceHealth(copy: Copy, activeSourceCount: number): HTMLElement {
    return h('details', { className: 'armenia-home__sources' },
      h('summary', { className: 'armenia-home__sources-heading' },
        h('strong', null, copy.localSources),
        h('span', null, `${activeSourceCount}/${ARMENIA_NEWS_SOURCE_NAMES.length} ${copy.activeSources} · ${copy.sourceDetails}`),
      ),
      h('div', { className: 'armenia-home__source-list' },
        ...ARMENIA_NEWS_SOURCE_NAMES.map((sourceName) => {
          const health = this.sourceHealth.get(sourceName);
          const active = Boolean(health && health.state !== 'unavailable' && health.itemCount > 0);
          const relevantCount = health?.relevantItemCount ?? 0;
          return h('span', {
            className: `armenia-home__source${active ? ' armenia-home__source--active' : ''}`,
            title: health ? `${health.state} · ${health.transportUsed ?? health.primaryTransport}` : 'unavailable',
          }, sourceName, h('small', null, String(relevantCount)));
        }),
      ),
    );
  }

  private renderDashboard(copy: Copy, signals: ArmeniaRankedSignal[]): HTMLElement {
    const lead = signals[0]!;
    return h('div', { className: 'armenia-home__dashboard' },
      h('section', { className: 'armenia-home__lead' }, h('div', { className: 'armenia-home__section-label' }, copy.lead), this.signalCard(lead, copy, true)),
      h('div', { className: 'armenia-home__lanes' },
        this.lane(signals, 'economy', copy.economy, copy, 4),
        this.lane(signals, 'security', copy.security, copy, 3),
        this.lane(signals, 'technology', copy.technology, copy, 3),
        this.lane(signals, 'region', copy.region, copy, 3),
      ),
    );
  }

  private renderFocusedDashboard(copy: Copy, signals: ArmeniaRankedSignal[]): HTMLElement {
    const [lead, ...remaining] = signals;
    return h('div', { className: 'armenia-home__focus-dashboard' },
      h('section', { className: 'armenia-home__lead' }, h('div', { className: 'armenia-home__section-label' }, copy.lead), this.signalCard(lead!, copy, true)),
      h('section', { className: 'armenia-home__focus-feed' }, h('div', { className: 'armenia-home__section-label' }, copy.focusList), ...remaining.slice(0, 10).map((signal) => this.signalCard(signal, copy, false))),
    );
  }

  private lane(signals: ArmeniaRankedSignal[], key: keyof typeof LANE_CATEGORIES, label: string, copy: Copy, limit: number): HTMLElement {
    const categories = LANE_CATEGORIES[key];
    const laneSignals = signals.filter((signal) => categories.includes(signal.category)).slice(0, limit);
    return h('section', { className: `armenia-home__lane armenia-home__lane--${key}` },
      h('div', { className: 'armenia-home__lane-heading' }, h('span', { className: 'armenia-home__lane-pulse', 'aria-hidden': 'true' }), h('strong', null, label), h('span', null, String(laneSignals.length))),
      ...(laneSignals.length > 0 ? laneSignals.map((signal) => this.signalCard(signal, copy, false)) : [h('div', { className: 'armenia-home__lane-empty' }, '—')]),
    );
  }

  private signalCard(signal: ArmeniaRankedSignal, copy: Copy, lead: boolean): HTMLElement {
    const raw = this.rawByUrl.get(signal.item.link);
    const scopeLabel = signal.scope === 'armenia' ? copy.direct : signal.scope === 'region' ? copy.regional : copy.external;
    const reason = copy.reason[signal.reasons[0] ?? 'armenia-mention'];
    const link = sanitizeUrl(signal.item.link);
    const evidenceCount = raw?.corroborationCount ?? 1;
    const footer: HTMLElement[] = [
      h('span', null, signal.item.source),
      h('span', null, relativeTime(signal.item.pubDate, this.language)),
      h('span', { title: reason }, reason),
    ];
    if (evidenceCount > 1) footer.push(h('span', null, `${evidenceCount} ${copy.corroborating}`));
    if (raw && !raw.publishedAtVerified) footer.push(h('span', { className: 'armenia-home__date-note' }, copy.unverifiedDate));

    const content = [
      h('div', { className: 'armenia-home__signal-meta' },
        h('span', { className: `armenia-home__scope armenia-home__scope--${signal.scope}` }, scopeLabel),
        h('span', { className: 'armenia-home__score' }, `${copy.impact} ${signal.score}`),
      ),
      h('strong', { className: 'armenia-home__signal-title' }, signal.item.title),
      h('div', { className: 'armenia-home__signal-footer' }, ...footer),
    ];
    if (!link) return h('article', { className: `armenia-home__signal${lead ? ' armenia-home__signal--lead' : ''}` }, ...content);
    return h('a', { className: `armenia-home__signal${lead ? ' armenia-home__signal--lead' : ''}`, href: link, target: '_blank', rel: 'noopener noreferrer', title: copy.source }, ...content);
  }

  public override destroy(): void {
    window.removeEventListener('armenia:language-change', this.languageHandler);
    window.removeEventListener('armenia:section-change', this.sectionHandler);
    window.removeEventListener('armenia:scope-change', this.scopeHandler);
    super.destroy();
  }
}
