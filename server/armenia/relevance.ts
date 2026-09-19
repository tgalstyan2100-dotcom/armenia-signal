import type {
  ArmeniaContentRelevanceReason,
  ArmeniaEventScope,
  ArmeniaSignalDomain,
  ArmeniaSignalUrgency,
  ArmeniaSourceDefinition,
} from '../../src/types/armenia-signal';
import type { RawArmeniaArticle } from './source-adapters';

export interface ClassifiedArmeniaArticle extends RawArmeniaArticle {
  primaryDomain: ArmeniaSignalDomain;
  domains: ArmeniaSignalDomain[];
  scope: ArmeniaEventScope;
  relevanceScore: number;
  relevanceReasons: ArmeniaContentRelevanceReason[];
  urgency: ArmeniaSignalUrgency;
}

const DIRECT_ARMENIA_TERMS = [
  'armenia', 'armenian', 'yerevan', 'gyumri', 'vanadzor', 'syunik', 'gegharkunik', 'tavush', 'shirak',
  'kotayk', 'aragatsotn', 'armavir', 'vayots dzor', 'sevan', 'ararat', 'artsakh', 'nagorno-karabakh',
  'հայաստան', 'հայկական', 'երևան', 'գյումրի', 'վանաձոր', 'սյունիք', 'տավուշ', 'շիրակ', 'կոտայք',
  'արարատ', 'արմավիր', 'արագածոտն', 'վայոց ձոր', 'սևան', 'արցախ',
  'армени', 'ереван', 'гюмри', 'ванадзор', 'сюник', 'таву', 'ширак', 'севан', 'арцах', 'карабах',
] as const;

const ARMENIA_LOCAL_CONTEXT_TERMS = [
  'government of armenia', 'armenian government', 'national assembly of armenia', 'armenian parliament',
  'central bank of armenia', 'armenian dram', 'nikol pashinyan', 'prime minister pashinyan',
  'yerevan municipality', 'armenian armed forces', 'constitutional court of armenia', 'armenian ministry',
  'կառավար', 'ազգային ժողով', 'կենտրոնական բանկ', 'կբ', 'դրամ', 'վարչապետ', 'նախարար', 'քաղաքապետ',
  'սահմանադրական դատարան', 'պն', 'ագն', 'ոստիկան', 'դատախազ', 'քննչական կոմիտե', 'պետական եկամուտների կոմիտե',
  'правительств армен', 'национальн собрание армен', 'центральн банк армен', 'армянск драм',
  'пашинян', 'мэрия ереван', 'вооруженн сил армен', 'конституционн суд армен',
] as const;

const SOUTH_CAUCASUS_TERMS = [
  'south caucasus', 'southern caucasus', 'transcaucasia',
  'հարավային կովկաս', 'южный кавказ', 'закавказ',
] as const;

const MATERIAL_IMPACT_TERMS = [
  'border', 'corridor', 'sanction', 'trade', 'export', 'import', 'tariff', 'currency', 'bank', 'investment',
  'gas', 'oil', 'energy', 'nuclear', 'transport', 'rail', 'road', 'airspace', 'flight', 'security', 'defense',
  'military', 'peace', 'ceasefire', 'treaty', 'diplomat', 'summit', 'agreement', 'blockade', 'closure',
  'earthquake', 'flood', 'wildfire', 'cyber', 'outage', 'disruption', 'eaeu', 'eurasian economic union',
  'middle corridor', 'north-south',
  'սահման', 'միջանցք', 'պատժամիջոց', 'առևտուր', 'արտահանում', 'ներմուծում', 'ներդրում', 'էներգ',
  'անվտանգ', 'պաշտպան', 'խաղաղ', 'կիբեր', 'աղետ', 'փակում', 'ճանապարհ',
  'границ', 'коридор', 'санкц', 'торгов', 'экспорт', 'импорт', 'инвест', 'энерг', 'безопас', 'оборон',
  'мирн', 'кибер', 'землетряс', 'перекрыт',
] as const;

const GLOBAL_POWER_TERMS = [
  'united states', 'u.s.', 'usa', 'washington', 'european union', 'european commission', 'eu ',
  'china', 'beijing', 'nato', 'osce',
  'ամն', 'միացյալ նահանգներ', 'եվրամիություն', 'չինաստան', 'նատօ', 'եահկ',
  'сша', 'евросоюз', 'европейский союз', 'китай', 'пекин', 'нато', 'обсе',
] as const;

const DOMAIN_TERMS: Record<ArmeniaSignalDomain, readonly string[]> = {
  politics: [
    'government', 'parliament', 'minister', 'president', 'election', 'party', 'diplomat', 'summit', 'treaty',
    'agreement', 'negotiation', 'foreign ministry', 'կառավար', 'ազգային ժողով', 'նախարար', 'նախագահ',
    'ընտրություն', 'կուսակց', 'դիվանագիտ', 'բանակց', 'правительств', 'парламент', 'министр', 'президент',
    'выбор', 'дипломат', 'переговор',
  ],
  economy: [
    'economy', 'economic', 'gdp', 'inflation', 'price', 'market', 'trade', 'export', 'import', 'tariff',
    'bank', 'central bank', 'currency', 'dram', 'investment', 'business', 'industry', 'tax', 'budget',
    'debt', 'employment', 'wage', 'տնտես', 'գնաճ', 'գին', 'շուկա', 'առևտուր', 'բանկ', 'դրամ',
    'ներդրում', 'բյուջե', 'աշխատավարձ', 'հարկ', 'эконом', 'инфляц', 'цен', 'рынок', 'торгов', 'банк',
    'драм', 'инвест', 'бюджет',
  ],
  energy: [
    'energy', 'electricity', 'power grid', 'gas', 'oil', 'fuel', 'nuclear', 'pipeline', 'hydro', 'solar',
    'էներգ', 'էլեկտր', 'գազ', 'նավթ', 'վառելիք', 'ատոմական', 'энерг', 'электр', 'газ', 'нефт',
    'топлив', 'атомн',
  ],
  security: [
    'security', 'defense', 'military', 'army', 'weapon', 'attack', 'strike', 'drone', 'missile', 'border',
    'ceasefire', 'conflict', 'war', 'terror', 'անվտանգ', 'պաշտպան', 'բանակ', 'հարձակ', 'սահման',
    'պատերազմ', 'безопас', 'оборон', 'арми', 'атак', 'границ', 'войн',
  ],
  infrastructure: [
    'infrastructure', 'road', 'rail', 'transport', 'airport', 'bridge', 'construction', 'telecom', 'water',
    'ճանապարհ', 'երկաթուղ', 'տրանսպորտ', 'օդանավակայան', 'կամուրջ', 'շինարար', 'ջրամատակարար',
    'инфраструкт', 'дорог', 'железн', 'транспорт', 'аэропорт', 'мост',
  ],
  emergency: [
    'emergency', 'earthquake', 'flood', 'wildfire', 'fire', 'rescue', 'evacuation', 'landslide', 'storm',
    'արտակարգ', 'երկրաշարժ', 'ջրհեղեղ', 'հրդեհ', 'փրկարար', 'տարհանում', 'սողանք',
    'чрезвычай', 'землетряс', 'наводнен', 'пожар', 'спасател', 'эвакуац',
  ],
  society: [
    'society', 'health', 'hospital', 'education', 'school', 'university', 'migration', 'refugee', 'protest',
    'culture', 'demographic', 'հասարակ', 'առողջ', 'հիվանդանոց', 'կրթ', 'դպրոց', 'համալսարան', 'գաղթ',
    'բողոք', 'մշակույթ', 'обществ', 'здоров', 'образован', 'миграц', 'протест', 'культур',
  ],
  technology: [
    'cyber', 'hack', 'ransomware', 'malware', 'data breach', 'artificial intelligence', ' ai ', 'startup',
    'software', 'telecom', 'digital', 'semiconductor', 'կիբեր', 'հաքեր', 'տեխնոլոգ', 'արհեստական բանականություն',
    'ստարտափ', 'թվայն', 'кибер', 'хакер', 'технолог', 'искусственный интеллект', 'стартап',
  ],
  regional: [
    'south caucasus', 'caucasus', 'azerbaijan', 'georgia', 'turkey', 'iran',
    'հարավային կովկաս', 'կովկաս', 'ադրբեջան', 'վրաստան', 'թուրքիա', 'իրան',
    'южный кавказ', 'кавказ', 'азербайджан', 'грузи', 'турци', 'иран',
  ],
};

const HIGH_URGENCY_TERMS = [
  'attack', 'strike', 'missile', 'drone', 'explosion', 'earthquake', 'evacuation', 'border closed',
  'major outage', 'ceasefire violation', 'հարձակում', 'հրթիռ', 'անօդաչու', 'պայթյուն', 'երկրաշարժ',
  'տարհանում', 'սահմանը փակ', 'խոշոր վթար', 'атак', 'ракет', 'дрон', 'взрыв', 'землетряс', 'эвакуац',
] as const;

const CRITICAL_URGENCY_TERMS = [
  'state of emergency', 'mass casualty', 'large-scale attack', 'major earthquake',
  'արտակարգ դրություն', 'զանգվածային զոհ', 'լայնածավալ հարձակում', 'ուժեղ երկրաշարժ',
  'чрезвычайное положение', 'массовые жертвы', 'масштабная атака', 'сильное землетрясение',
] as const;

function normalize(value: string): string {
  return ` ${value.normalize('NFKC').toLocaleLowerCase()} `.replace(/\s+/g, ' ');
}

function containsAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function uniqueDomains(domains: readonly ArmeniaSignalDomain[]): ArmeniaSignalDomain[] {
  return [...new Set(domains)];
}

function classifyDomains(text: string, source: ArmeniaSourceDefinition): ArmeniaSignalDomain[] {
  const matched = (Object.entries(DOMAIN_TERMS) as Array<[ArmeniaSignalDomain, readonly string[]]>)
    .filter(([, terms]) => containsAny(text, terms))
    .map(([domain]) => domain);

  if (matched.length > 0) return uniqueDomains(matched);
  return uniqueDomains(source.domains.length > 0 ? source.domains : ['regional']);
}

function primaryDomain(domains: readonly ArmeniaSignalDomain[]): ArmeniaSignalDomain {
  const priority: ArmeniaSignalDomain[] = [
    'emergency', 'security', 'politics', 'economy', 'energy', 'technology', 'infrastructure', 'society', 'regional',
  ];
  return priority.find((domain) => domains.includes(domain)) ?? 'regional';
}

function urgencyFor(text: string): ArmeniaSignalUrgency {
  if (containsAny(text, CRITICAL_URGENCY_TERMS)) return 'critical';
  if (containsAny(text, HIGH_URGENCY_TERMS)) return 'high';
  if (containsAny(text, MATERIAL_IMPACT_TERMS)) return 'medium';
  return 'low';
}

function isOfficial(source: ArmeniaSourceDefinition): boolean {
  return source.provenance === 'official-primary' || source.provenance === 'official-data';
}

export function classifyArmeniaArticle(article: RawArmeniaArticle): ClassifiedArmeniaArticle | null {
  const { source } = article;
  const text = normalize([article.title, article.summary ?? ''].join(' '));
  const mentionsArmenia = containsAny(text, DIRECT_ARMENIA_TERMS);
  const localContext = containsAny(text, ARMENIA_LOCAL_CONTEXT_TERMS);
  const southCaucasus = containsAny(text, SOUTH_CAUCASUS_TERMS);
  const materialImpact = containsAny(text, MATERIAL_IMPACT_TERMS);
  const externalPower = containsAny(text, GLOBAL_POWER_TERMS);

  const reasons: ArmeniaContentRelevanceReason[] = [];
  let scope: ArmeniaEventScope;
  let relevanceScore: number;

  if (mentionsArmenia) {
    reasons.push('armenia-mention');
    scope = 'armenia';
    relevanceScore = isOfficial(source) ? 98 : 92;
  } else if (source.geography === 'armenia' && isOfficial(source)) {
    reasons.push('armenia-source');
    scope = 'armenia';
    relevanceScore = 90;
  } else if (source.geography === 'armenia' && localContext) {
    reasons.push('armenia-source');
    scope = 'armenia';
    relevanceScore = 82;
  } else if (southCaucasus && materialImpact) {
    reasons.push(externalPower ? 'external-impact' : 'south-caucasus');
    scope = externalPower ? 'external-impact' : 'south-caucasus';
    relevanceScore = externalPower ? 72 : 78;
  } else {
    return null;
  }

  const domains = classifyDomains(text, source);
  const urgency = urgencyFor(text);
  const urgencyBoost = urgency === 'critical' ? 8 : urgency === 'high' ? 5 : urgency === 'medium' ? 2 : 0;

  return {
    ...article,
    domains,
    primaryDomain: primaryDomain(domains),
    scope,
    relevanceScore: Math.min(100, relevanceScore + urgencyBoost),
    relevanceReasons: reasons,
    urgency,
  };
}
