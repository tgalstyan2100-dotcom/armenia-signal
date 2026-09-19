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
  rankArmeniaNews,
  type ArmeniaRankedSignal,
  type ArmeniaRelevanceReason,
  type ArmeniaSignalCategory,
} from '@/config/armenia-home';
import { ARMENIA_NEWS_SOURCE_NAMES } from '@/config/armenia-feeds';
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
  economySignals: string;
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
  reason: Record<ArmeniaRelevanceReason, string>;
};

const COPY: Record<ArmeniaLanguage, Copy> = {
  hy: {
    panelTitle: 'ՀԱՅԱՍՏԱՆ․ ՈՒՂԻՂ ԱԶԴԱԿՆԵՐ', eyebrow: 'ARMENIA / LIVE SIGNALS', title: 'Կարևորը՝ որոշումների համար',
    description: 'Հայաստանին ուղղակի կամ նյութականորեն ազդող ազդակներ՝ առանց գլոբալ աղմուկի։', signals: 'Ազդակներ',
    economySignals: 'Տնտեսական', urgent: 'Շտապ', lead: 'Գլխավոր ազդակ', economy: 'Տնտեսություն և շուկաներ', security: 'Անվտանգություն և դիվանագիտություն',
    technology: 'Տեխնոլոգիաներ', region: 'Տարածաշրջանային այլ ազդակներ', empty: 'Այս բաժնում Հայաստանի վերաբերյալ հաստատված ազդակ դեռ չկա։',
    emptyDetail: 'Բլոկը չենք լրացնում պատահական համաշխարհային լուրերով։', source: 'Բացել աղբյուրը', direct: 'Հայաստան', regional: 'Տարածաշրջան', external: 'Արտաքին ազդեցություն',
    focusDescription: 'Միայն այս բաժնին վերաբերող և Հայաստանի վրա ազդեցություն ունեցող ազդակներ։', focusList: 'Վերջին ազդակներ',
    localSources: 'Հայկական աղբյուրներ', activeSources: 'ակտիվ',
    reason: { 'armenia-mention': 'Հայաստանի ուղղակի հիշատակում', 'armenia-location': 'Հայաստանի տարածք', 'armenia-source': 'Հայկական սկզբնաղբյուր', 'south-caucasus': 'Հարավային Կովկաս', 'core-neighbor': 'Հարևան երկրից նյութական ազդեցություն', 'external-impact': 'ԱՄՆ/ԵՄ/Չինաստան՝ տարածաշրջանային ազդեցություն' },
  },
  ru: {
    panelTitle: 'АРМЕНИЯ: ЖИВЫЕ СИГНАЛЫ', eyebrow: 'ARMENIA / LIVE SIGNALS', title: 'Главное для решений',
    description: 'Сигналы с прямым или существенным влиянием на Армению, без глобального шума', signals: 'Сигналы',
    economySignals: 'Экономика', urgent: 'Срочные', lead: 'Главный сигнал', economy: 'Экономика и рынки', security: 'Безопасность и дипломатия',
    technology: 'Технологии', region: 'Другие региональные сигналы', empty: 'В этом разделе пока нет подтверждённых сигналов по Армении.',
    emptyDetail: 'Мы не заполняем блок случайными мировыми новостями.', source: 'Открыть источник', direct: 'Армения', regional: 'Регион', external: 'Внешнее влияние',
    focusDescription: 'Только сигналы этого раздела, способные повлиять на Армению.', focusList: 'Последние сигналы',
    localSources: 'Армянские источники', activeSources: 'активны',
    reason: { 'armenia-mention': 'Прямое упоминание Армении', 'armenia-location': 'Территория Армении', 'armenia-source': 'Армянский первоисточник', 'south-caucasus': 'Южный Кавказ', 'core-neighbor': 'Существенное влияние соседней страны', 'external-impact': 'Влияние США/ЕС/Китая на регион' },
  },
  en: {
    panelTitle: 'ARMENIA LIVE SIGNALS', eyebrow: 'ARMENIA / LIVE SIGNALS', title: 'What matters for decisions',
    description: 'Signals with direct or material impact on Armenia, without the global noise', signals: 'Signals',
    economySignals: 'Economic', urgent: 'Urgent', lead: 'Lead signal', economy: 'Economy & markets', security: 'Security & diplomacy',
    technology: 'Technology', region: 'Other regional signals', empty: 'No verified Armenia-relevant signal in this section yet.',
    emptyDetail: 'We will not fill this space with unrelated global headlines.', source: 'Open source', direct: 'Armenia', regional: 'Region', external: 'External impact',
    focusDescription: 'Only signals in this section with material impact on Armenia.', focusList: 'Latest signals',
    localSources: 'Armenian sources', activeSources: 'active',
    reason: { 'armenia-mention': 'Direct Armenia mention', 'armenia-location': 'Located in Armenia', 'armenia-source': 'Armenian primary source', 'south-caucasus': 'South Caucasus impact', 'core-neighbor': 'Material impact from a core neighbor', 'external-impact': 'US/EU/China regional impact' },
  },
};

const LANE_CATEGORIES: Record<'economy' | 'security' | 'technology' | 'region', ArmeniaSignalCategory[]> = {
  economy: ['economy', 'energy'],
  security: ['security', 'politics'],
  technology: ['technology'],
  region: ['society', 'region'],
};

function readLanguage(): ArmeniaLanguage {
  const stored = safeStorageGet(ARMENIA_LANGUAGE_STORAGE_KEY);
  if (!stored) return 'hy';
  try {
    const parsed = JSON.parse(stored) as unknown;
    return isArmeniaLanguage(parsed) ? parsed : 'hy';
  } catch {
    return 'hy';
  }
}

function readSection(): ArmeniaSectionId {
  const stored = safeStorageGet(ARMENIA_SECTION_STORAGE_KEY);
  if (!stored) return 'home';
  try {
    const parsed = JSON.parse(stored) as unknown;
    return isArmeniaSectionId(parsed) ? parsed : 'home';
  } catch {
    return 'home';
  }
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

export class ArmeniaHomePanel extends Panel {
  private language: ArmeniaLanguage = readLanguage();
  private section: ArmeniaSectionId = readSection();
  private ranked: ArmeniaRankedSignal[] = [];

  private readonly languageHandler = (event: Event) => {
    const language = (event as CustomEvent<{ language?: unknown }>).detail?.language;
    if (!isArmeniaLanguage(language)) return;
    this.language = language;
    this.render();
  };

  private readonly sectionHandler = (event: Event) => {
    const sectionId = (event as CustomEvent<{ sectionId?: unknown }>).detail?.sectionId;
    if (!isArmeniaSectionId(sectionId)) return;
    this.section = sectionId;
    this.render();
  };

  constructor() {
    super({ id: 'armenia-home', title: COPY[readLanguage()].panelTitle, showCount: true, className: 'armenia-home-panel', defaultRowSpan: 2 });
    this.getElement().classList.add('panel-wide');
    window.addEventListener('armenia:language-change', this.languageHandler);
    window.addEventListener('armenia:section-change', this.sectionHandler);
    this.render();
  }

  public updateNews(items: NewsItem[]): void {
    this.ranked = rankArmeniaNews(items);
    const urgent = this.ranked.some((signal) => signal.item.threat?.level === 'critical' || signal.item.threat?.level === 'high');
    this.setSeverity(urgent ? 'high' : this.ranked.length > 0 ? 'low' : 'none');
    this.render();
  }

  public hasData(): boolean {
    return this.ranked.length > 0;
  }

  private render(): void {
    const copy = COPY[this.language];
    const visibleSignals = filterArmeniaSignalsForSection(this.ranked, this.section);
    const sectionLabel = getArmeniaSection(this.section).label[this.language];
    const focused = !['home', 'map', 'region'].includes(this.section);
    const title = this.getElement().querySelector<HTMLElement>('.panel-title');
    if (title) title.textContent = focused ? `${sectionLabel} · ${copy.signals}` : copy.panelTitle;
    this.setCount(visibleSignals.length);
    this.setDataBadge(visibleSignals.length > 0 ? 'live' : 'unavailable');

    const economyCount = visibleSignals.filter((signal) => signal.tags.includes('economy') || signal.tags.includes('energy')).length;
    const urgentCount = visibleSignals.filter((signal) => signal.item.threat?.level === 'critical' || signal.item.threat?.level === 'high').length;
    const sourceCounts = new Map<string, number>();
    for (const signal of this.ranked) sourceCounts.set(signal.item.source, (sourceCounts.get(signal.item.source) ?? 0) + 1);
    const activeSourceCount = ARMENIA_NEWS_SOURCE_NAMES.filter((source) => (sourceCounts.get(source) ?? 0) > 0).length;

    this.setContentNodes(
      h('div', { className: 'armenia-home' },
        h('section', { className: 'armenia-home__masthead' },
          h('div', { className: 'armenia-home__identity' },
            h('span', { className: 'armenia-home__eyebrow' }, focused ? `${sectionLabel} / LIVE` : copy.eyebrow),
            h('strong', { className: 'armenia-home__title' }, focused ? sectionLabel : copy.title),
            h('span', { className: 'armenia-home__description' }, focused ? copy.focusDescription : copy.description),
          ),
          h('div', { className: 'armenia-home__metrics' },
            this.metric(String(visibleSignals.length), copy.signals, 'signal'),
            this.metric(String(economyCount), copy.economySignals, 'economy'),
            this.metric(String(urgentCount), copy.urgent, urgentCount > 0 ? 'urgent' : 'calm'),
          ),
        ),
        h('section', { className: 'armenia-home__sources', 'aria-label': copy.localSources },
          h('div', { className: 'armenia-home__sources-heading' },
            h('strong', null, copy.localSources),
            h('span', null, `${activeSourceCount}/${ARMENIA_NEWS_SOURCE_NAMES.length} ${copy.activeSources}`),
          ),
          h('div', { className: 'armenia-home__source-list' },
            ...ARMENIA_NEWS_SOURCE_NAMES.map((source) => {
              const count = sourceCounts.get(source) ?? 0;
              return h('span', {
                className: `armenia-home__source${count > 0 ? ' armenia-home__source--active' : ''}`,
              }, source, h('small', null, String(count)));
            }),
          ),
        ),
        visibleSignals.length === 0
          ? h('div', { className: 'armenia-home__empty' },
            h('span', { className: 'armenia-home__empty-mark', 'aria-hidden': 'true' }, 'ԱՄ'),
            h('strong', null, copy.empty),
            h('span', null, copy.emptyDetail),
          )
          : focused ? this.renderFocusedDashboard(copy, visibleSignals) : this.renderDashboard(copy, visibleSignals),
      ),
    );
  }

  private metric(value: string, label: string, tone: string): HTMLElement {
    return h('div', { className: `armenia-home__metric armenia-home__metric--${tone}` },
      h('strong', null, value),
      h('span', null, label),
    );
  }

  private renderDashboard(copy: Copy, signals: ArmeniaRankedSignal[]): HTMLElement {
    const lead = signals[0]!;
    return h('div', { className: 'armenia-home__dashboard' },
      h('section', { className: 'armenia-home__lead' },
        h('div', { className: 'armenia-home__section-label' }, copy.lead),
        this.signalCard(lead, copy, true),
      ),
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
      h('section', { className: 'armenia-home__lead' },
        h('div', { className: 'armenia-home__section-label' }, copy.lead),
        this.signalCard(lead!, copy, true),
      ),
      h('section', { className: 'armenia-home__focus-feed' },
        h('div', { className: 'armenia-home__section-label' }, copy.focusList),
        ...remaining.slice(0, 8).map((signal) => this.signalCard(signal, copy, false)),
      ),
    );
  }

  private lane(signals: ArmeniaRankedSignal[], key: keyof typeof LANE_CATEGORIES, label: string, copy: Copy, limit: number): HTMLElement {
    const categories = LANE_CATEGORIES[key];
    const laneSignals = signals.filter((signal) => categories.includes(signal.category)).slice(0, limit);
    return h('section', { className: `armenia-home__lane armenia-home__lane--${key}` },
      h('div', { className: 'armenia-home__lane-heading' },
        h('span', { className: 'armenia-home__lane-pulse', 'aria-hidden': 'true' }),
        h('strong', null, label),
        h('span', null, String(laneSignals.length)),
      ),
      ...(laneSignals.length > 0
        ? laneSignals.map((signal) => this.signalCard(signal, copy, false))
        : [h('div', { className: 'armenia-home__lane-empty' }, '—')]),
    );
  }

  private signalCard(signal: ArmeniaRankedSignal, copy: Copy, lead: boolean): HTMLElement {
    const scopeLabel = signal.scope === 'armenia' ? copy.direct : signal.scope === 'region' ? copy.regional : copy.external;
    const reason = copy.reason[signal.reasons[0] ?? 'armenia-mention'];
    const link = sanitizeUrl(signal.item.link);
    const content = [
      h('div', { className: 'armenia-home__signal-meta' },
        h('span', { className: `armenia-home__scope armenia-home__scope--${signal.scope}` }, scopeLabel),
        h('span', { className: 'armenia-home__score' }, `${signal.score}/100`),
      ),
      h('strong', { className: 'armenia-home__signal-title' }, signal.item.title),
      h('div', { className: 'armenia-home__signal-footer' },
        h('span', null, signal.item.source),
        h('span', null, relativeTime(signal.item.pubDate, this.language)),
        h('span', { title: reason }, reason),
      ),
    ];
    if (!link) return h('article', { className: `armenia-home__signal${lead ? ' armenia-home__signal--lead' : ''}` }, ...content);
    return h('a', {
      className: `armenia-home__signal${lead ? ' armenia-home__signal--lead' : ''}`,
      href: link,
      target: '_blank',
      rel: 'noopener noreferrer',
      title: copy.source,
    }, ...content);
  }

  public override destroy(): void {
    window.removeEventListener('armenia:language-change', this.languageHandler);
    window.removeEventListener('armenia:section-change', this.sectionHandler);
    super.destroy();
  }
}
