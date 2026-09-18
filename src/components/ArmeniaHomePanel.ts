import { Panel } from './Panel';
import { ARMENIA_LANGUAGE_STORAGE_KEY, isArmeniaLanguage, type ArmeniaLanguage } from '@/config/armenia-sections';
import { rankArmeniaNews, type ArmeniaRankedSignal, type ArmeniaRelevanceReason, type ArmeniaSignalCategory } from '@/config/armenia-home';
import type { NewsItem } from '@/types';
import { h } from '@/utils/dom-utils';
import { sanitizeUrl } from '@/utils/sanitize';

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
  reason: Record<ArmeniaRelevanceReason, string>;
};

const COPY: Record<ArmeniaLanguage, Copy> = {
  hy: {
    panelTitle: 'ՀԱՅԱՍՏԱՆԻ ՕՐՎԱ ՊԱՏԿՐԸ', eyebrow: 'ARMENIA / 24H SIGNAL', title: 'Կարևորը՝ որոշումների համար',
    description: 'Հայաստանին ուղղակի կամ նյութականորեն ազդող ազդանշաններ՝ առանց գլոբալ աղմուկի։', signals: 'Կարևոր ազդանշան',
    economySignals: 'Տնտեսական', urgent: 'Շտապ', lead: 'Գլխավոր ազդանշան', economy: 'Տնտեսություն և շուկաներ', security: 'Անվտանգություն և դիվանագիտություն',
    technology: 'Տեխնոլոգիաներ', region: 'Տարածաշրջանային այլ ազդանշաններ', empty: 'Հայաստանի վերաբերյալ հաստատված ազդանշան դեռ չկա։',
    emptyDetail: 'Մենք չենք լրացնում բլոկը պատահական համաշխարհային լուրերով։', source: 'Բացել աղբյուրը', direct: 'Հայաստան', regional: 'Տարածաշրջան', external: 'Արտաքին ազդեցություն',
    reason: { 'armenia-mention': 'Հայաստանի ուղղակի հիշատակում', 'armenia-location': 'Հայաստանի տարածք', 'south-caucasus': 'Հարավային Կովկաս', 'core-neighbor': 'Հարևան երկրից նյութական ազդեցություն', 'external-impact': 'ԱՄՆ/ԵՄ/Չինաստան՝ տարածաշրջանային ազդեցություն' },
  },
  ru: {
    panelTitle: 'КАРТИНА ДНЯ: АРМЕНИЯ', eyebrow: 'ARMENIA / 24H SIGNAL', title: 'Главное для решений', description: 'Сигналы с прямым или существенным влиянием на Армению, без глобального шума', signals: 'Важные сигналы', economySignals: 'Экономика', urgent: 'Срочные', lead: 'Главный сигнал', economy: 'Экономика и рынки', security: 'Безопасность и дипломатия', technology: 'Технологии', region: 'Другие региональные сигналы', empty: 'Подтверждённых сигналов по Армении пока нет.', emptyDetail: 'Мы не заполняем блок случайными мировыми новостями.', source: 'Открыть источник', direct: 'Армения', regional: 'Регион', external: 'Внешнее влияние',
    reason: { 'armenia-mention': 'Прямое упоминание Армении', 'armenia-location': 'Территория Армении', 'south-caucasus': 'Южный Кавказ', 'core-neighbor': 'Существенное влияние соседней страны', 'external-impact': 'Влияние США/ЕС/Китая на регион' },
  },
  en: {
    panelTitle: 'ARMENIA DAILY SIGNAL', eyebrow: 'ARMENIA / 24H SIGNAL', title: 'What matters for decisions', description: 'Signals with direct or material impact on Armenia, without the global noise', signals: 'Material signals', economySignals: 'Economic', urgent: 'Urgent', lead: 'Lead signal', economy: 'Economy & markets', security: 'Security & diplomacy', technology: 'Technology', region: 'Other regional signals', empty: 'No verified Armenia-relevant signal yet.', emptyDetail: 'We will not fill this space with unrelated global headlines.', source: 'Open source', direct: 'Armenia', regional: 'Region', external: 'External impact',
    reason: { 'armenia-mention': 'Direct Armenia mention', 'armenia-location': 'Located in Armenia', 'south-caucasus': 'South Caucasus impact', 'core-neighbor': 'Material impact from a core neighbor', 'external-impact': 'US/EU/China regional impact' },
  },
};

const LANE_CATEGORIES: Record<'economy' | 'security' | 'technology' | 'region', ArmeniaSignalCategory[]> = {
  economy: ['economy', 'energy'],
  security: ['security', 'politics'],
  technology: ['technology'],
  region: ['society', 'region'],
};

function readLanguage(): ArmeniaLanguage {
  try {
    const parsed = JSON.parse(localStorage.getItem(ARMENIA_LANGUAGE_STORAGE_KEY) ?? '"hy"');
    return isArmeniaLanguage(parsed) ? parsed : 'hy';
  } catch {
    return 'hy';
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
  private ranked: ArmeniaRankedSignal[] = [];
  private readonly languageHandler = (event: Event) => {
    const language = (event as CustomEvent<{ language?: unknown }>).detail?.language;
    if (!isArmeniaLanguage(language)) return;
    this.language = language;
    this.render();
  };

  constructor() {
    super({ id: 'armenia-home', title: COPY[readLanguage()].panelTitle, showCount: true, className: 'armenia-home-panel', defaultRowSpan: 2 });
    this.getElement().classList.add('panel-wide');
    window.addEventListener('armenia:language-change', this.languageHandler);
    this.render();
  }

  public updateNews(items: NewsItem[]): void {
    this.ranked = rankArmeniaNews(items);
    this.setCount(this.ranked.length);
    this.setDataBadge(this.ranked.length > 0 ? 'live' : 'unavailable');
    const urgent = this.ranked.some((signal) => signal.item.threat?.level === 'critical' || signal.item.threat?.level === 'high');
    this.setSeverity(urgent ? 'high' : this.ranked.length > 0 ? 'low' : 'none');
    this.render();
  }

  public hasData(): boolean {
    return this.ranked.length > 0;
  }

  private render(): void {
    const copy = COPY[this.language];
    const title = this.getElement().querySelector<HTMLElement>('.panel-title');
    if (title) title.textContent = copy.panelTitle;
    const economyCount = this.ranked.filter((signal) => signal.tags.includes('economy') || signal.tags.includes('energy')).length;
    const urgentCount = this.ranked.filter((signal) => signal.item.threat?.level === 'critical' || signal.item.threat?.level === 'high').length;

    this.setContentNodes(
      h('div', { className: 'armenia-home' },
        h('section', { className: 'armenia-home__masthead' },
          h('div', { className: 'armenia-home__identity' },
            h('span', { className: 'armenia-home__eyebrow' }, copy.eyebrow),
            h('strong', { className: 'armenia-home__title' }, copy.title),
            h('span', { className: 'armenia-home__description' }, copy.description),
          ),
          h('div', { className: 'armenia-home__metrics' },
            this.metric(String(this.ranked.length), copy.signals, 'signal'),
            this.metric(String(economyCount), copy.economySignals, 'economy'),
            this.metric(String(urgentCount), copy.urgent, urgentCount > 0 ? 'urgent' : 'calm'),
          ),
        ),
        this.ranked.length === 0
          ? h('div', { className: 'armenia-home__empty' },
            h('span', { className: 'armenia-home__empty-mark', 'aria-hidden': 'true' }, 'ԱՄ'),
            h('strong', null, copy.empty),
            h('span', null, copy.emptyDetail),
          )
          : this.renderDashboard(copy),
      ),
    );
  }

  private metric(value: string, label: string, tone: string): HTMLElement {
    return h('div', { className: `armenia-home__metric armenia-home__metric--${tone}` },
      h('strong', null, value),
      h('span', null, label),
    );
  }

  private renderDashboard(copy: Copy): HTMLElement {
    const lead = this.ranked[0]!;
    return h('div', { className: 'armenia-home__dashboard' },
      h('section', { className: 'armenia-home__lead' },
        h('div', { className: 'armenia-home__section-label' }, copy.lead),
        this.signalCard(lead, copy, true),
      ),
      h('div', { className: 'armenia-home__lanes' },
        this.lane('economy', copy.economy, copy, 4),
        this.lane('security', copy.security, copy, 3),
        this.lane('technology', copy.technology, copy, 3),
        this.lane('region', copy.region, copy, 3),
      ),
    );
  }

  private lane(key: keyof typeof LANE_CATEGORIES, label: string, copy: Copy, limit: number): HTMLElement {
    const categories = LANE_CATEGORIES[key];
    const signals = this.ranked.filter((signal) => categories.includes(signal.category)).slice(0, limit);
    return h('section', { className: `armenia-home__lane armenia-home__lane--${key}` },
      h('div', { className: 'armenia-home__lane-heading' },
        h('span', { className: 'armenia-home__lane-pulse', 'aria-hidden': 'true' }),
        h('strong', null, label),
        h('span', null, String(signals.length)),
      ),
      ...(signals.length > 0
        ? signals.map((signal) => this.signalCard(signal, copy, false))
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
    super.destroy();
  }
}
