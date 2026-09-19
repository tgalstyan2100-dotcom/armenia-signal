import type {
  ArmeniaContentEvidence,
  ArmeniaContentLanguage,
  ArmeniaContentSignal,
  ArmeniaEventScope,
  ArmeniaSignalDomain,
  ArmeniaSignalUrgency,
  ArmeniaSourceProvenance,
} from '../../src/types/armenia-signal';
import type { ClassifiedArmeniaArticle } from './relevance';

const PROVENANCE_RANK: Record<ArmeniaSourceProvenance, number> = {
  'official-primary': 100,
  'official-data': 95,
  'public-newswire': 85,
  newsroom: 75,
  'sector-newsroom': 70,
  'regional-newsroom': 65,
  'international-institution': 60,
};

const SCOPE_RANK: Record<ArmeniaEventScope, number> = {
  armenia: 3,
  'south-caucasus': 2,
  'external-impact': 1,
};

const URGENCY_RANK: Record<ArmeniaSignalUrgency, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(' ')
      .filter((token) => token.length >= 3),
  );
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection++;
  }
  const union = left.size + right.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function isSameStory(left: ClassifiedArmeniaArticle, right: ClassifiedArmeniaArticle): boolean {
  const a = normalizeTitle(left.title);
  const b = normalizeTitle(right.title);
  if (a === b) return true;
  if (a.length < 20 || b.length < 20) return false;
  return jaccard(tokenSet(a), tokenSet(b)) >= 0.72;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function timestamp(item: Pick<ClassifiedArmeniaArticle, 'publishedAt' | 'discoveredAt' | 'observedAt'>): number {
  const raw = item.publishedAt ?? item.discoveredAt ?? item.observedAt;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function chooseLead(
  cluster: readonly ClassifiedArmeniaArticle[],
  preferredLanguage?: ArmeniaContentLanguage,
): ClassifiedArmeniaArticle {
  return [...cluster].sort((left, right) => {
    const importance = right.importanceScore - left.importanceScore;
    if (Math.abs(importance) > 12) return importance;
    if (preferredLanguage) {
      const leftMatch = left.language === preferredLanguage || left.language === 'mixed' ? 1 : 0;
      const rightMatch = right.language === preferredLanguage || right.language === 'mixed' ? 1 : 0;
      if (rightMatch !== leftMatch) return rightMatch - leftMatch;
    }
    if (importance !== 0) return importance;
    const quality = right.qualityScore - left.qualityScore;
    if (quality !== 0) return quality;
    const provenance = PROVENANCE_RANK[right.source.provenance] - PROVENANCE_RANK[left.source.provenance];
    if (provenance !== 0) return provenance;
    return timestamp(right) - timestamp(left);
  })[0]!;
}

function strongestScope(cluster: readonly ClassifiedArmeniaArticle[]): ArmeniaEventScope {
  return [...cluster]
    .map((item) => item.scope)
    .sort((a, b) => SCOPE_RANK[b] - SCOPE_RANK[a])[0] ?? 'external-impact';
}

function strongestUrgency(cluster: readonly ClassifiedArmeniaArticle[]): ArmeniaSignalUrgency {
  return [...cluster]
    .map((item) => item.urgency)
    .sort((a, b) => URGENCY_RANK[b] - URGENCY_RANK[a])[0] ?? 'low';
}

function confidenceFor(cluster: readonly ClassifiedArmeniaArticle[], lead: ClassifiedArmeniaArticle): number {
  const uniqueSources = new Set(cluster.map((item) => item.source.id)).size;
  const official = lead.source.provenance === 'official-primary' || lead.source.provenance === 'official-data';
  if (official && lead.publishedAtVerified) return uniqueSources > 1 ? 0.99 : 0.96;
  if (official) return uniqueSources > 1 ? 0.94 : 0.88;
  if (uniqueSources >= 3) return 0.94;
  if (uniqueSources === 2) return 0.86;
  return lead.source.provenance === 'public-newswire' ? 0.78 : 0.70;
}

function evidenceFor(item: ClassifiedArmeniaArticle): ArmeniaContentEvidence {
  return {
    sourceId: item.source.id,
    sourceName: item.source.name,
    url: item.url,
    title: item.title,
    ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
    ...(item.discoveredAt ? { discoveredAt: item.discoveredAt } : {}),
    observedAt: item.observedAt,
    transport: item.transport,
    provenance: item.source.provenance,
    language: item.language,
    publishedAtVerified: item.publishedAtVerified,
    isPrimaryRecord: item.source.provenance === 'official-primary' || item.source.provenance === 'official-data',
  };
}

function unionDomains(cluster: readonly ClassifiedArmeniaArticle[]): ArmeniaSignalDomain[] {
  return [...new Set(cluster.flatMap((item) => item.domains))];
}

export function deduplicateArmeniaArticles(
  input: readonly ClassifiedArmeniaArticle[],
  preferredLanguage?: ArmeniaContentLanguage,
): ArmeniaContentSignal[] {
  const clusters: ClassifiedArmeniaArticle[][] = [];

  for (const item of input) {
    const existing = clusters.find((cluster) => cluster.some((member) => isSameStory(member, item)));
    if (existing) existing.push(item);
    else clusters.push([item]);
  }

  const signals = clusters.map((cluster) => {
    const lead = chooseLead(cluster, preferredLanguage);
    const uniqueBySource = new Map<string, ClassifiedArmeniaArticle>();
    for (const item of cluster) {
      const current = uniqueBySource.get(item.source.id);
      if (!current || timestamp(item) > timestamp(current)) {
        uniqueBySource.set(item.source.id, item);
      }
    }

    const evidence = [...uniqueBySource.values()]
      .sort((a, b) => PROVENANCE_RANK[b.source.provenance] - PROVENANCE_RANK[a.source.provenance])
      .map(evidenceFor);
    const corroborationCount = evidence.length;
    const corroborationBoost = Math.min(8, Math.max(0, corroborationCount - 1) * 2);
    const domains = unionDomains(cluster);
    const observedAt = [...cluster]
      .map((item) => item.observedAt)
      .sort()
      .at(-1) ?? lead.observedAt;
    const relevanceScore = Math.max(...cluster.map((item) => item.relevanceScore));
    const freshnessScore = Math.max(...cluster.map((item) => item.freshnessScore));
    const qualityScore = Math.max(...cluster.map((item) => item.qualityScore));
    const importanceScore = Math.min(100, Math.max(...cluster.map((item) => item.importanceScore)) + corroborationBoost);

    return {
      id: `am-${stableHash(normalizeTitle(lead.title))}`,
      title: lead.title,
      ...(lead.summary ? { summary: lead.summary } : {}),
      url: lead.url,
      sourceId: lead.source.id,
      sourceName: lead.source.name,
      ...(lead.publishedAt ? { publishedAt: lead.publishedAt } : {}),
      ...(lead.discoveredAt ? { discoveredAt: lead.discoveredAt } : {}),
      observedAt,
      language: lead.language,
      publishedAtVerified: lead.publishedAtVerified,
      primaryDomain: lead.primaryDomain,
      domains,
      scope: strongestScope(cluster),
      relevanceScore,
      importanceScore,
      freshnessScore,
      qualityScore,
      relevanceReasons: [...new Set(cluster.flatMap((item) => item.relevanceReasons))],
      urgency: strongestUrgency(cluster),
      provenance: lead.source.provenance,
      confidence: confidenceFor(cluster, lead),
      corroborationCount,
      evidence,
    } satisfies ArmeniaContentSignal;
  });

  return signals.sort((left, right) => {
    const importance = right.importanceScore - left.importanceScore;
    if (importance !== 0) return importance;
    const urgency = URGENCY_RANK[right.urgency] - URGENCY_RANK[left.urgency];
    if (urgency !== 0) return urgency;
    const freshness = right.freshnessScore - left.freshnessScore;
    if (freshness !== 0) return freshness;
    const leftTime = Date.parse(left.publishedAt ?? left.discoveredAt ?? left.observedAt);
    const rightTime = Date.parse(right.publishedAt ?? right.discoveredAt ?? right.observedAt);
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}
