export type ArmeniaSignalDomain =
  | 'politics'
  | 'economy'
  | 'energy'
  | 'security'
  | 'infrastructure'
  | 'emergency'
  | 'society'
  | 'technology'
  | 'regional';

export type ArmeniaSourceGeography = 'armenia' | 'regional' | 'international';

export type ArmeniaSourceProvenance =
  | 'official-primary'
  | 'official-data'
  | 'public-newswire'
  | 'newsroom'
  | 'sector-newsroom'
  | 'regional-newsroom'
  | 'international-institution';

export type ArmeniaSourceCollectionStrategy =
  | 'direct-rss'
  | 'google-news-site'
  | 'structured-adapter';

export type ArmeniaSourceReadiness = 'live' | 'planned';

export type ArmeniaVerificationPolicy =
  | 'primary-record'
  | 'corroborate-material-claim'
  | 'corroborate-before-alert';

export interface ArmeniaSourceDefinition {
  id: string;
  name: string;
  aliases?: readonly string[];
  host: string;
  homepagePath?: string;
  geography: ArmeniaSourceGeography;
  countryCodes: readonly string[];
  languages: readonly ('hy' | 'ru' | 'en')[];
  domains: readonly ArmeniaSignalDomain[];
  provenance: ArmeniaSourceProvenance;
  verificationPolicy: ArmeniaVerificationPolicy;
  collection: {
    strategy: ArmeniaSourceCollectionStrategy;
    readiness: ArmeniaSourceReadiness;
    feedPath?: string;
  };
}

export type ArmeniaEventScope = 'armenia' | 'south-caucasus' | 'external-impact';

export type ArmeniaEventVerification =
  | 'single-source'
  | 'primary-confirmed'
  | 'corroborated'
  | 'contested';

export interface ArmeniaEventEvidence {
  sourceId: string;
  sourceName: string;
  url: string;
  publishedAt?: string;
  observedAt: string;
  title?: string;
  language?: 'hy' | 'ru' | 'en';
  isPrimaryRecord: boolean;
}

export interface ArmeniaEventRecord {
  id: string;
  title: string;
  summary?: string;
  domains: readonly ArmeniaSignalDomain[];
  scope: ArmeniaEventScope;
  countryCodes: readonly string[];
  locationNames?: readonly string[];
  firstSeenAt: string;
  lastSeenAt: string;
  verification: ArmeniaEventVerification;
  evidence: readonly ArmeniaEventEvidence[];
}

export type ArmeniaContentTransport = 'direct-rss' | 'google-news-site';

export type ArmeniaSourceHealthState = 'healthy' | 'degraded' | 'unavailable';

export type ArmeniaSignalUrgency = 'low' | 'medium' | 'high' | 'critical';

export type ArmeniaContentRelevanceReason =
  | 'armenia-mention'
  | 'armenia-location'
  | 'armenia-source'
  | 'south-caucasus'
  | 'external-impact';

export interface ArmeniaSourceHealth {
  sourceId: string;
  sourceName: string;
  host: string;
  state: ArmeniaSourceHealthState;
  primaryTransport: ArmeniaContentTransport;
  transportUsed?: ArmeniaContentTransport;
  itemCount: number;
  relevantItemCount: number;
  checkedAt: string;
  errorCode?: 'timeout' | 'http' | 'network' | 'parse' | 'empty';
}

export interface ArmeniaContentEvidence {
  sourceId: string;
  sourceName: string;
  url: string;
  title: string;
  publishedAt?: string;
  observedAt: string;
  transport: ArmeniaContentTransport;
  provenance: ArmeniaSourceProvenance;
  isPrimaryRecord: boolean;
}

export interface ArmeniaContentSignal {
  id: string;
  title: string;
  summary?: string;
  url: string;
  sourceId: string;
  sourceName: string;
  publishedAt?: string;
  observedAt: string;
  primaryDomain: ArmeniaSignalDomain;
  domains: readonly ArmeniaSignalDomain[];
  scope: ArmeniaEventScope;
  relevanceScore: number;
  relevanceReasons: readonly ArmeniaContentRelevanceReason[];
  urgency: ArmeniaSignalUrgency;
  provenance: ArmeniaSourceProvenance;
  confidence: number;
  corroborationCount: number;
  evidence: readonly ArmeniaContentEvidence[];
}

export interface ArmeniaContentSnapshot {
  version: 1;
  generatedAt: string;
  signals: readonly ArmeniaContentSignal[];
  sources: readonly ArmeniaSourceHealth[];
}
