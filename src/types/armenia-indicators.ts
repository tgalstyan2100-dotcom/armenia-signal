export type ArmeniaIndicatorDomain = 'fx' | 'macro' | 'banking' | 'market' | 'energy';

export type ArmeniaIndicatorId =
  | 'usd-amd'
  | 'eur-amd'
  | 'rub-amd'
  | 'policy-rate'
  | 'annual-inflation'
  | 'credit-gdp-gap'
  | 'countercyclical-buffer'
  | 'economic-activity-yoy'
  | 'cpi-yoy'
  | 'amx-corporate-bond-index'
  | 'electricity-tariff-status';

export type ArmeniaIndicatorStatus = 'live' | 'stale' | 'unavailable';

export interface ArmeniaIndicator {
  id: ArmeniaIndicatorId;
  domain: ArmeniaIndicatorDomain;
  value: number | string;
  unit?: '%' | 'AMD' | 'index' | 'status';
  change?: number;
  changeUnit?: 'absolute' | 'percent';
  period?: string;
  updatedAt?: string;
  status: ArmeniaIndicatorStatus;
  sourceName: string;
  sourceUrl: string;
  note?: string;
}

export interface ArmeniaIndicatorSourceHealth {
  sourceId: 'cba' | 'armstat' | 'amx' | 'psrc';
  sourceName: string;
  state: 'healthy' | 'degraded' | 'unavailable';
  checkedAt: string;
  itemCount: number;
  errorCode?: 'timeout' | 'http' | 'network' | 'parse' | 'empty';
}

export interface ArmeniaIndicatorSnapshot {
  version: 1;
  generatedAt: string;
  indicators: readonly ArmeniaIndicator[];
  sources: readonly ArmeniaIndicatorSourceHealth[];
}
