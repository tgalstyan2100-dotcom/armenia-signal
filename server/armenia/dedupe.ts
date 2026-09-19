import type {
  ArmeniaContentEvidence,
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

function timestamp(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function chooseLead(cluster: readonly ClassifiedArmeniaArticle[]): ClassifiedArmeniaArticle {
  return [...cluster].sort((left, right) => {
    const provenance = PROVENANCE_RANK[right.source.provenance] - PROVENANCE_RANK[left.source.provenance];
    if (provenance !== 0) return provenance;
    const relevance = right.relevanceScore - left.relevanceScore;
    if (relevance !== 0) return relevance;
    return timestamp(right.publishedAt) - timestamp(left.publishedAt);
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
  if (lead.source.provenance === 'official-primary' || lead.source.provenance === 'official-data') {
    return uniqueSources > 1 ? 0.99 : 0.96;
  }
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
    observedAt: item.observedAt,
    transport: item.transport,
    provenance: item.source.provenance,
    isPrimaryRecord: item.source.provenance === 'official-primary' || item.source.provenance === 'official-data',
  };
}

function unionDomains(cluster: readonly ClassifiedArmeniaArticle[]): ArmeniaSignalDomain[] {
  return [...new Set(cluster.flatMap((item) => item.domains))];
}

export function deduplicateArmeniaArticles(
  input: readonly ClassifiedArmeniaArticle[],
): ArmeniaContentSignal[] {
  const clusters: ClassifiedArmeniaArticle[][] = [];

  for (const item of input) {
    const existing = clusters.find((cluster) => cluster.some((member) => isSameStory(member, item)));
    if (existing) existing.push(item);
    else clusters.push([item]);
  }

  const signals = clusters.map((cluster) => {
    const lead = chooseLead(cluster);
    const uniqueBySource = new Map<string, ClassifiedArmeniaArticle>();
    for (const item of cluster) {
      const current = uniqueBySource.get(item.source.id);
      if (!current || timestamp(item.publishedAt) > timestamp(current.publishedAt)) {
        uniqueBySource.set(item.source.id, item);
      }
    }
    const evidence = [...uniqueBySource.values()]
      .sort((a, b) => PROVENANCE_RANK[b.source.provenance] - PROVENANCE_RANK[a.source.provenance])
      .map(evidenceFor);
    const corroborationCount = evidence.length;
    const corroborationBoost = Math.min(8, Math.max(0, corroborationCount - 1) * 3);
    const domains = unionDomains(cluster);
    const observedAt = [...cluster]
      .map((item) => item.observedAt)
      .sort()
      .at(-1) ?? lead.observedAt;

    return {
      id: `am-${stableHash(normalizeTitle(lead.title))}`,
      title: lead.title,
      ...(lead.summary ? { summary: lead.summary } : {}),
      url: lead.url,
      sourceId: lead.source.id,
      sourceName: lead.source.name,
      ...(lead.publishedAt ? { publishedAt: lead.publishedAt } : {}),
      observedAt,
      primaryDomain: lead.primaryDomain,
      domains,
      scope: strongestScope(cluster),
      relevanceScore: Math.min(100, lead.relevanceScore + corroborationBoost),
      relevanceReasons: [...new Set(cluster.flatMap((item) => item.relevanceReasons))],
      urgency: strongestUrgency(cluster),
      provenance: lead.source.provenance,
      confidence: confidenceFor(cluster, lead),
      corroborationCount,
      evidence,
    } satisfies ArmeniaContentSignal;
  });

  return signals.sort((left, right) => {
    const score = right.relevanceScore - left.relevanceScore;
    if (score !== 0) return score;
    return timestamp(right.publishedAt) - timestamp(left.publishedAt);
  });
}
