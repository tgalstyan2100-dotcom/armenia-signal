import { ARMENIA_SOURCE_REGISTRY } from '@/config/armenia-source-registry';
import type { ArmeniaSignalDomain, ArmeniaSourceDefinition } from '@/types/armenia-signal';
import type { NewsItem } from '@/types';
import type { ArmeniaSectionId } from '@/config/armenia-sections';

export type ArmeniaSignalCategory = 'economy' | 'security' | 'politics' | 'technology' | 'energy' | 'society' | 'region';
export type ArmeniaSignalScope = 'armenia' | 'region' | 'world-impact';
export type ArmeniaRelevanceReason = 'armenia-mention' | 'armenia-location' | 'armenia-source' | 'south-caucasus' | 'core-neighbor' | 'external-impact';

export interface ArmeniaRankedSignal {
  item: NewsItem;
  category: ArmeniaSignalCategory;
  tags: ArmeniaSignalCategory[];
  scope: ArmeniaSignalScope;
  reasons: ArmeniaRelevanceReason[];
  score: number;
}

const ARMENIA_SOURCE_BY_NAME = new Map<string, ArmeniaSourceDefinition>();
for (const source of ARMENIA_SOURCE_REGISTRY) {
  ARMENIA_SOURCE_BY_NAME.set(source.name.toLocaleLowerCase(), source);
  for (const alias of source.aliases ?? []) ARMENIA_SOURCE_BY_NAME.set(alias.toLocaleLowerCase(), source);
}

const SOURCE_DOMAIN_FALLBACK: Partial<Record<ArmeniaSignalDomain, ArmeniaSignalCategory>> = {
  politics: 'politics',
  economy: 'economy',
  energy: 'energy',
  security: 'security',
  technology: 'technology',
  society: 'society',
  infrastructure: 'economy',
  emergency: 'society',
  regional: 'region',
};

const DIRECT_ARMENIA_TERMS = [
  'armenia', 'armenian', 'yerevan', 'gyumri', 'vanadzor', 'syunik', 'gegharkunik', 'tavush', 'shirak',
  'kotayk', 'aragatsotn', 'armavir', 'vayots dzor', 'sevan', 'ararat', 'artsakh', 'nagorno-karabakh',
  'հայաստան', 'հայկական', 'երևան', 'գյումրի', 'վանաձոր', 'սյունիք', 'արցախ', 'սևան',
  'армени', 'ереван', 'гюмри', 'ванадзор', 'сюник', 'арцах', 'карабах', 'севан',
] as const;

const ARMENIA_LOCAL_CONTEXT_TERMS = [
  'government of armenia', 'armenian government', 'national assembly of armenia', 'armenian parliament',
  'central bank of armenia', 'armenian dram', 'nikol pashinyan', 'prime minister pashinyan',
  'yerevan municipality', 'armenian armed forces', 'constitutional court of armenia', 'armenian ministry',
  'կառավար', 'ազգային ժողով', 'կենտրոնական բանկ', 'կբ', 'դրամ', 'վարչապետ', 'նախարար', 'քաղաքապետ', 'սահմանադրական դատարան', 'պն', 'ագն',
  'правительств армен', 'национальн собрание армен', 'центральн банк армен', 'армянск драм',
  'пашинян', 'мэрия ереван', 'вооруженн сил армен', 'конституционн суд армен',
] as const;

const SOUTH_CAUCASUS_TERMS = [
  'south caucasus', 'southern caucasus', 'transcaucasia', 'հարավային կովկաս', 'южный кавказ', 'закавказ',
] as const;

const GLOBAL_POWER_TERMS = [
  'united states', 'u.s.', 'usa', 'washington', 'european union', 'european commission', 'eu ', 'china', 'beijing',
  'ամն', 'միացյալ նահանգներ', 'եվրամիություն', 'չինաստան',
  'сша', 'евросоюз', 'европейский союз', 'китай', 'пекин',
] as const;

const IMPACT_TERMS = [
  'border', 'corridor', 'sanction', 'trade', 'export', 'import', 'tariff', 'currency', 'bank', 'investment', 'gas', 'oil',
  'energy', 'nuclear', 'transport', 'rail', 'road', 'airspace', 'flight', 'security', 'defense', 'military', 'peace',
  'ceasefire', 'treaty', 'diplomat', 'summit', 'agreement', 'blockade', 'closure', 'earthquake', 'flood', 'wildfire',
  'cyber', 'outage', 'disruption', 'eaeu', 'eurasian economic union', 'middle corridor', 'north-south',
  'սահման', 'միջանցք', 'պատժամիջոց', 'առևտուր', 'արտահանում', 'ներմուծում', 'ներդրում', 'էներգ', 'անվտանգ', 'պաշտպան', 'խաղաղ', 'կիբեր', 'աղետ',
  'границ', 'коридор', 'санкц', 'торгов', 'экспорт', 'импорт', 'инвест', 'энерг', 'безопас', 'оборон', 'мирн', 'кибер', 'землетряс',
] as const;

const CATEGORY_TERMS: Record<Exclude<ArmeniaSignalCategory, 'region'>, readonly string[]> = {
  technology: ['cyber', 'hack', 'ransomware', 'malware', 'data breach', 'artificial intelligence', ' ai ', 'startup', 'software', 'telecom', 'digital', 'կիբեր', 'հաքեր', 'տեխնոլոգ', 'արհեստական բանականություն', 'кибер', 'хакер', 'технолог', 'искусственный интеллект'],
  security: ['security', 'defense', 'military', 'army', 'weapon', 'attack', 'strike', 'drone', 'missile', 'border', 'ceasefire', 'conflict', 'war', 'terror', 'անվտանգ', 'պաշտպան', 'բանակ', 'հարձակ', 'սահման', 'պատերազմ', 'безопас', 'оборон', 'арми', 'атак', 'границ', 'войн'],
  economy: ['economy', 'economic', 'gdp', 'inflation', 'price', 'market', 'trade', 'export', 'import', 'tariff', 'bank', 'central bank', 'currency', 'dram', 'investment', 'business', 'industry', 'tax', 'budget', 'debt', 'employment', 'wage', 'տնտես', 'գնաճ', 'գին', 'շուկա', 'առևտուր', 'բանկ', 'դրամ', 'ներդրում', 'բյուջե', 'աշխատավարձ', 'эконом', 'инфляц', 'цен', 'рынок', 'торгов', 'банк', 'драм', 'инвест', 'бюджет'],
  energy: ['energy', 'electricity', 'power grid', 'gas', 'oil', 'fuel', 'nuclear', 'pipeline', 'hydro', 'solar', 'էներգ', 'էլեկտր', 'գազ', 'նավթ', 'վառելիք', 'ատոմական', 'энерг', 'электр', 'газ', 'нефт', 'топлив', 'атомн'],
  politics: ['government', 'parliament', 'minister', 'president', 'election', 'party', 'diplomat', 'summit', 'treaty', 'agreement', 'negotiation', 'foreign ministry', 'կառավար', 'ազգային ժողով', 'նախարար', 'նախագահ', 'ընտրություն', 'դիվանագիտ', 'բանակց', 'правительств', 'парламент', 'министр', 'президент', 'выбор', 'дипломат', 'переговор'],
  society: ['society', 'health', 'hospital', 'education', 'school', 'migration', 'refugee', 'protest', 'earthquake', 'flood', 'wildfire', 'weather', 'հասարակ', 'առողջ', 'կրթ', 'գաղթ', 'բողոք', 'երկրաշարժ', 'հրդեհ', 'обществ', 'здоров', 'образован', 'миграц', 'протест', 'землетряс', 'пожар'],
};

function normalize(value: string): string {
  return ` ${value.normalize('NFKC').toLocaleLowerCase()} `.replace(/\s+/g, ' ');
}

function containsAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function itemText(item: NewsItem): string {
  return normalize([item.title, item.snippet, item.source, item.locationName].filter(Boolean).join(' '));
}

function isInsideArmenia(item: NewsItem): boolean {
  return item.lat != null && item.lon != null && item.lat >= 38.8 && item.lat <= 41.4 && item.lon >= 43.4 && item.lon <= 46.7;
}

function armeniaSource(item: NewsItem): ArmeniaSourceDefinition | null {
  return ARMENIA_SOURCE_BY_NAME.get(item.source.toLocaleLowerCase()) ?? null;
}

function sourceFallbackCategory(item: NewsItem): ArmeniaSignalCategory | null {
  const source = armeniaSource(item);
  if (!source) return null;
  for (const domain of source.domains) {
    const category = SOURCE_DOMAIN_FALLBACK[domain];
    if (category) return category;
  }
  return null;
}

function categoryTags(item: NewsItem, text: string): ArmeniaSignalCategory[] {
  const tags = (Object.entries(CATEGORY_TERMS) as Array<[Exclude<ArmeniaSignalCategory, 'region'>, readonly string[]]>)
    .filter(([, terms]) => containsAny(text, terms))
    .map(([category]) => category);
  if (tags.length > 0) return tags;
  const fallback = sourceFallbackCategory(item);
  return fallback ? [fallback] : ['region'];
}

function primaryCategory(tags: ArmeniaSignalCategory[]): ArmeniaSignalCategory {
  const priority: ArmeniaSignalCategory[] = ['technology', 'security', 'economy', 'energy', 'politics', 'society', 'region'];
  return priority.find((category) => tags.includes(category)) ?? 'region';
}

function relevance(item: NewsItem, text: string): Pick<ArmeniaRankedSignal, 'scope' | 'reasons'> | null {
  const reasons: ArmeniaRelevanceReason[] = [];
  const source = armeniaSource(item);
  const domesticSource = source?.geography === 'armenia';
  const officialSource = domesticSource
    && (source.provenance === 'official-primary' || source.provenance === 'official-data');
  const locatedInArmenia = isInsideArmenia(item);
  const mentionsArmenia = containsAny(text, DIRECT_ARMENIA_TERMS);
  const hasLocalInstitutionContext = containsAny(text, ARMENIA_LOCAL_CONTEXT_TERMS);

  if (mentionsArmenia) reasons.push('armenia-mention');
  if (locatedInArmenia) reasons.push('armenia-location');
  if (officialSource || (domesticSource && hasLocalInstitutionContext)) {
    reasons.push('armenia-source');
  }

  if (reasons.length > 0) return { scope: 'armenia', reasons };

  const southCaucasus = containsAny(text, SOUTH_CAUCASUS_TERMS);
  const materialImpact = containsAny(text, IMPACT_TERMS);
  if (!southCaucasus || !materialImpact) return null;

  const externalPower = containsAny(text, GLOBAL_POWER_TERMS);
  return externalPower
    ? { scope: 'world-impact', reasons: ['external-impact'] }
    : { scope: 'region', reasons: ['south-caucasus'] };
}

function recencyScore(item: NewsItem, nowMs: number): number {
  if (item.pubDateMissing) return 0;
  const timestamp = new Date(item.pubDate).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  const ageHours = Math.max(0, (nowMs - timestamp) / 3_600_000);
  if (ageHours <= 6) return 10;
  if (ageHours <= 24) return 7;
  if (ageHours <= 72) return 4;
  if (ageHours <= 168) return 1;
  return -8;
}

function signalScore(item: NewsItem, scope: ArmeniaSignalScope, tags: ArmeniaSignalCategory[], nowMs: number): number {
  const scopeScore = scope === 'armenia' ? 68 : scope === 'region' ? 38 : 28;
  const importance = Math.max(0, Math.min(100, item.importanceScore ?? 0)) * 0.12;
  const credibility = Math.max(0, Math.min(100, item.credibilityScore ?? 50)) * 0.06;
  const threat = item.threat?.level === 'critical' ? 10 : item.threat?.level === 'high' ? 7 : item.threat?.level === 'medium' ? 3 : 0;
  const economyPriority = tags.includes('economy') ? 4 : 0;
  return Math.round(Math.min(100, scopeScore + importance + credibility + threat + economyPriority + recencyScore(item, nowMs)));
}

function normalizedHeadline(item: NewsItem): string {
  return normalize(item.title).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function rankArmeniaNews(items: readonly NewsItem[], nowMs = Date.now()): ArmeniaRankedSignal[] {
  const ranked: ArmeniaRankedSignal[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const headlineKey = normalizedHeadline(item);
    if (!headlineKey || seen.has(headlineKey)) continue;
    const timestamp = new Date(item.pubDate).getTime();
    if (!item.pubDateMissing && Number.isFinite(timestamp) && nowMs - timestamp > 14 * 24 * 3_600_000) continue;
    const text = itemText(item);
    const matched = relevance(item, text);
    if (!matched) continue;
    const tags = categoryTags(item, text);
    ranked.push({
      item,
      category: primaryCategory(tags),
      tags,
      scope: matched.scope,
      reasons: matched.reasons,
      score: signalScore(item, matched.scope, tags, nowMs),
    });
    seen.add(headlineKey);
  }
  return ranked.sort((left, right) => right.score - left.score || new Date(right.item.pubDate).getTime() - new Date(left.item.pubDate).getTime());
}

const SECTION_CATEGORIES: Partial<Record<ArmeniaSectionId, ArmeniaSignalCategory[]>> = {
  security: ['security', 'politics', 'technology'],
  economy: ['economy', 'energy'],
  politics: ['politics'],
  technology: ['technology'],
  energy: ['energy'],
  society: ['society'],
  emergencies: ['society', 'security', 'energy'],
};

export function filterArmeniaSignalsForSection(
  signals: readonly ArmeniaRankedSignal[],
  section: ArmeniaSectionId,
): ArmeniaRankedSignal[] {
  if (section === 'home' || section === 'map') return [...signals];
  if (section === 'region') return signals.filter((signal) => signal.scope !== 'armenia');
  const categories = SECTION_CATEGORIES[section] ?? [];
  return signals.filter((signal) => {
    if (section === 'emergencies' && (signal.item.threat?.level === 'critical' || signal.item.threat?.level === 'high')) return true;
    return signal.tags.some((tag) => categories.includes(tag));
  });
}
