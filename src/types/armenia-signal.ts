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
