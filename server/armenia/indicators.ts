import type {
  ArmeniaIndicator,
  ArmeniaIndicatorSnapshot,
  ArmeniaIndicatorSourceHealth,
} from '../../src/types/armenia-indicators';

const CACHE_TTL_MS = 5 * 60 * 1_000;
const FETCH_TIMEOUT_MS = 7_000;
const USER_AGENT = 'armenia-signal/1.0 (+https://armenia-signal.vercel.app)';

const URLS = {
  cbaHome: 'https://www.cba.am/en',
  cbaRates: 'https://api.cba.am/exchangerates.asmx',
  armstatCpi: 'https://statbank.armstat.am/api/v1/en/ArmStatBank/1%20Econnomy%20and%20finance/12%20Consumer%20Prices/1.2.1%20Monthly%20indicators/EF-cpi-mi3.px',
  armstatActivity: 'https://statbank.armstat.am/api/v1/en/ArmStatBank/1%20Econnomy%20and%20finance/15%20National%20Accounts/EF-NA-01.px',
  amx: 'https://amx.am/',
  psrc: 'https://www.psrc.am/contents/newsPress/electricity-tariff-2026',
} as const;

type ErrorCode = NonNullable<ArmeniaIndicatorSourceHealth['errorCode']>;

class FetchFailure extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
  }
}

let cachedSnapshot: ArmeniaIndicatorSnapshot | null = null;
let cachedAt = 0;
let inFlight: Promise<ArmeniaIndicatorSnapshot> | null = null;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, raw: string) => {
      const code = Number(raw);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    });
}

function htmlText(html: string): string {
  return decodeEntities(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new FetchFailure('http', `HTTP ${response.status}`);
    return response;
  } catch (error) {
    if (error instanceof FetchFailure) throw error;
    if (controller.signal.aborted) throw new FetchFailure('timeout', 'Request timed out');
    throw new FetchFailure('network', error instanceof Error ? error.message : 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  return (await fetchWithTimeout(url, init)).text();
}

function numberFrom(text: string | undefined): number | null {
  if (!text) return null;
  const parsed = Number(text.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function health(
  sourceId: ArmeniaIndicatorSourceHealth['sourceId'],
  sourceName: string,
  state: ArmeniaIndicatorSourceHealth['state'],
  itemCount: number,
  errorCode?: ErrorCode,
): ArmeniaIndicatorSourceHealth {
  return {
    sourceId,
    sourceName,
    state,
    checkedAt: new Date().toISOString(),
    itemCount,
    ...(errorCode ? { errorCode } : {}),
  };
}

function liveIndicator(
  indicator: Omit<ArmeniaIndicator, 'status'>,
): ArmeniaIndicator {
  return { ...indicator, status: 'live' };
}

function regexNumber(text: string, patterns: readonly RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = numberFrom(match?.[1]);
    if (value != null) return value;
  }
  return null;
}

async function collectCba(): Promise<{ indicators: ArmeniaIndicator[]; health: ArmeniaIndicatorSourceHealth }> {
  const indicators: ArmeniaIndicator[] = [];
  let homepageError: ErrorCode | undefined;
  let ratesError: ErrorCode | undefined;

  try {
    const body = `<?xml version="1.0" encoding="utf-8"?>\n` +
      `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
      `<soap:Body><ExchangeRatesLatest xmlns="http://www.cba.am/" /></soap:Body></soap:Envelope>`;
    const xml = await fetchText(URLS.cbaRates, {
      method: 'POST',
      headers: {
        Accept: 'text/xml',
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://www.cba.am/ExchangeRatesLatest',
      },
      body,
    });
    const currentDate = parseIsoDate(xml.match(/<CurrentDate>([^<]+)<\/CurrentDate>/i)?.[1]);
    const rows = [...xml.matchAll(/<ExchangeRate>([\s\S]*?)<\/ExchangeRate>/gi)];
    const wanted = new Map([
      ['USD', 'usd-amd'],
      ['EUR', 'eur-amd'],
      ['RUB', 'rub-amd'],
    ] as const);
    for (const row of rows) {
      const block = row[1] ?? '';
      const iso = block.match(/<ISO>([^<]+)<\/ISO>/i)?.[1]?.trim();
      if (!iso || !wanted.has(iso as 'USD' | 'EUR' | 'RUB')) continue;
      const rate = numberFrom(block.match(/<Rate>([^<]+)<\/Rate>/i)?.[1]);
      const amount = numberFrom(block.match(/<Amount>([^<]+)<\/Amount>/i)?.[1]) ?? 1;
      const difference = numberFrom(block.match(/<Difference>([^<]+)<\/Difference>/i)?.[1]);
      if (rate == null || amount <= 0) continue;
      indicators.push(liveIndicator({
        id: wanted.get(iso as 'USD' | 'EUR' | 'RUB')!,
        domain: 'fx',
        value: Number((rate / amount).toFixed(4)),
        unit: 'AMD',
        ...(difference != null ? { change: Number((difference / amount).toFixed(4)), changeUnit: 'absolute' as const } : {}),
        ...(currentDate ? { updatedAt: currentDate } : {}),
        sourceName: 'Central Bank of Armenia',
        sourceUrl: 'https://www.cba.am/en/exchange-rates-retrieval',
      }));
    }
  } catch (error) {
    ratesError = error instanceof FetchFailure ? error.code : 'parse';
  }

  try {
    const page = htmlText(await fetchText(URLS.cbaHome));
    const policyRate = regexNumber(page, [
      /Policy\s+Rate\s*([0-9]+(?:\.[0-9]+)?)\s*%/i,
      /Refinancing\s+Rate\s*([0-9]+(?:\.[0-9]+)?)\s*%/i,
    ]);
    const inflation = regexNumber(page, [
      /Annual\s+Inflation\s*([0-9]+(?:\.[0-9]+)?)\s*%/i,
      /Inflation\s*([0-9]+(?:\.[0-9]+)?)\s*%/i,
    ]);
    const creditGap = regexNumber(page, [
      /Credit\s*\/\s*GDP\s+gap\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*%/i,
    ]);
    const buffer = regexNumber(page, [
      /Countercyclical(?:\s+capital)?\s+buffer\s*([0-9]+(?:\.[0-9]+)?)\s*%/i,
      /Countercyclical\s+buffer\s*([0-9]+(?:\.[0-9]+)?)\s*%/i,
    ]);

    if (policyRate != null) indicators.push(liveIndicator({
      id: 'policy-rate', domain: 'macro', value: policyRate, unit: '%', sourceName: 'Central Bank of Armenia', sourceUrl: URLS.cbaHome,
    }));
    if (inflation != null) indicators.push(liveIndicator({
      id: 'annual-inflation', domain: 'macro', value: inflation, unit: '%', sourceName: 'Central Bank of Armenia', sourceUrl: URLS.cbaHome,
    }));
    if (creditGap != null) indicators.push(liveIndicator({
      id: 'credit-gdp-gap', domain: 'banking', value: creditGap, unit: '%', sourceName: 'Central Bank of Armenia', sourceUrl: URLS.cbaHome,
    }));
    if (buffer != null) indicators.push(liveIndicator({
      id: 'countercyclical-buffer', domain: 'banking', value: buffer, unit: '%', sourceName: 'Central Bank of Armenia', sourceUrl: URLS.cbaHome,
    }));
  } catch (error) {
    homepageError = error instanceof FetchFailure ? error.code : 'parse';
  }

  const state = indicators.length >= 5 ? 'healthy' : indicators.length > 0 ? 'degraded' : 'unavailable';
  return {
    indicators,
    health: health('cba', 'Central Bank of Armenia', state, indicators.length, state === 'unavailable' ? (ratesError ?? homepageError ?? 'empty') : undefined),
  };
}

type PxVariable = { code: string; text?: string; values?: string[]; valueTexts?: string[]; time?: boolean };
type PxMetadata = { variables?: PxVariable[] };
type JsonStatResponse = { value?: Array<number | null> };
type PxMode = 'cpi-yoy' | 'economic-activity-yoy';

function selectionForVariable(variable: PxVariable, mode: PxMode): { filter: 'item'; values: string[] } {
  const values = variable.values ?? [];
  const labels = variable.valueTexts ?? values;
  if (values.length === 0) throw new FetchFailure('parse', `PxWeb variable ${variable.code} has no values`);
  const name = `${variable.code} ${variable.text ?? ''}`.toLocaleLowerCase();

  if (name.includes('year')) {
    return { filter: 'item', values: [values.at(-1)!] };
  }
  if (name.includes('month')) {
    return { filter: 'item', values };
  }
  if (mode === 'cpi-yoy' && name.includes('period')) {
    const index = labels.findIndex((label) => /each\s+month|corresponding\s+month|similar\s+month/i.test(label));
    return { filter: 'item', values: [values[index >= 0 ? index : 0]!] };
  }
  if (mode === 'economic-activity-yoy' && (name.includes('indicator') || name.includes('index'))) {
    let index = labels.findIndex((label) => /corresponding.*previous\s+year|same.*previous\s+year|previous\s+year\s*=\s*100|to\s+previous\s+year/i.test(label));
    if (index < 0) index = labels.findIndex((label) => /previous\s+year|growth/i.test(label));
    if (index < 0) throw new FetchFailure('parse', 'Economic activity year-on-year indicator not found');
    return { filter: 'item', values: [values[index]!] };
  }

  // Keep otherwise-unrelated dimensions narrow rather than requesting a large
  // cube and accidentally reading the wrong flattened series.
  return { filter: 'item', values: [values[0]!] };
}

function lastNumericIndex(value: Array<number | null> | undefined): number {
  if (!value) return -1;
  for (let i = value.length - 1; i >= 0; i--) {
    const candidate = value[i];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return i;
  }
  return -1;
}

async function queryPxWeb(url: string, mode: PxMode): Promise<{ value: number; period?: string }> {
  const metadata = await (await fetchWithTimeout(url, { headers: { Accept: 'application/json' } })).json() as PxMetadata;
  const variables = metadata.variables ?? [];
  if (variables.length === 0) throw new FetchFailure('parse', 'PxWeb metadata has no variables');
  const query = variables.map((variable) => ({
    code: variable.code,
    selection: selectionForVariable(variable, mode),
  }));
  const body = JSON.stringify({ query, response: { format: 'json-stat2' } });
  const data = await (await fetchWithTimeout(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body,
  })).json() as JsonStatResponse;
  const index = lastNumericIndex(data.value);
  if (index < 0) throw new FetchFailure('empty', 'PxWeb returned no numeric value');
  const value = data.value?.[index];
  if (typeof value !== 'number') throw new FetchFailure('empty', 'PxWeb returned no numeric value');

  const yearVariable = variables.find((variable) => `${variable.code} ${variable.text ?? ''}`.toLocaleLowerCase().includes('year'));
  const monthVariable = variables.find((variable) => `${variable.code} ${variable.text ?? ''}`.toLocaleLowerCase().includes('month'));
  const year = yearVariable?.valueTexts?.at(-1) ?? yearVariable?.values?.at(-1);
  const month = monthVariable?.valueTexts?.[Math.min(index, (monthVariable.valueTexts?.length ?? 1) - 1)]
    ?? monthVariable?.values?.[Math.min(index, (monthVariable.values?.length ?? 1) - 1)];
  const period = [month, year].filter(Boolean).join(' ');
  return { value, ...(period ? { period } : {}) };
}

async function collectArmstat(): Promise<{ indicators: ArmeniaIndicator[]; health: ArmeniaIndicatorSourceHealth }> {
  const indicators: ArmeniaIndicator[] = [];
  let lastError: ErrorCode | undefined;
  try {
    const cpi = await queryPxWeb(URLS.armstatCpi, 'cpi-yoy');
    // The monthly CPI table is usually an index where 100 = no year-on-year
    // change. Convert index-style output to a readable percentage only when it
    // falls in a plausible index range; otherwise preserve the returned value.
    const value = cpi.value > 70 && cpi.value < 140 ? Number((cpi.value - 100).toFixed(1)) : Number(cpi.value.toFixed(1));
    indicators.push(liveIndicator({
      id: 'cpi-yoy', domain: 'macro', value, unit: '%', ...(cpi.period ? { period: cpi.period } : {}),
      sourceName: 'Statistical Committee of Armenia',
      sourceUrl: 'https://statbank.armstat.am/',
      note: 'Latest available CPI series value from ArmStatBank.',
    }));
  } catch (error) {
    lastError = error instanceof FetchFailure ? error.code : 'parse';
  }

  try {
    const activity = await queryPxWeb(URLS.armstatActivity, 'economic-activity-yoy');
    const value = activity.value > 70 && activity.value < 140 ? Number((activity.value - 100).toFixed(1)) : Number(activity.value.toFixed(1));
    indicators.push(liveIndicator({
      id: 'economic-activity-yoy', domain: 'macro', value, unit: '%', ...(activity.period ? { period: activity.period } : {}),
      sourceName: 'Statistical Committee of Armenia', sourceUrl: 'https://statbank.armstat.am/',
      note: 'Latest available national accounts/economic activity series value from ArmStatBank.',
    }));
  } catch (error) {
    lastError = error instanceof FetchFailure ? error.code : 'parse';
  }

  const state = indicators.length === 2 ? 'healthy' : indicators.length > 0 ? 'degraded' : 'unavailable';
  return { indicators, health: health('armstat', 'Statistical Committee of Armenia', state, indicators.length, state === 'unavailable' ? (lastError ?? 'empty') : undefined) };
}

async function collectAmx(): Promise<{ indicators: ArmeniaIndicator[]; health: ArmeniaIndicatorSourceHealth }> {
  try {
    const text = htmlText(await fetchText(URLS.amx));
    const indexMatch = text.match(/Corporate\s+bonds[^0-9]{0,120}Last\s*([0-9]+(?:\.[0-9]+)?)[^%]{0,100}Chg%\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*%/i)
      ?? text.match(/Last\s*([0-9]+(?:\.[0-9]+)?)[^%]{0,100}Chg%\s*([+-]?[0-9]+(?:\.[0-9]+)?)\s*%/i);
    if (!indexMatch) throw new FetchFailure('parse', 'AMX index block not found');
    const value = numberFrom(indexMatch[1]);
    const change = numberFrom(indexMatch[2]);
    if (value == null) throw new FetchFailure('empty', 'AMX value missing');
    const dateRaw = text.match(/Data\s+as\s+of\s+([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{4})/i)?.[1];
    const parsedDate = dateRaw ? parseIsoDate(dateRaw.split(/[.\/-]/).reverse().join('-')) : undefined;
    const indicator = liveIndicator({
      id: 'amx-corporate-bond-index', domain: 'market', value, unit: 'index',
      ...(change != null ? { change, changeUnit: 'percent' as const } : {}),
      ...(parsedDate ? { updatedAt: parsedDate } : {}),
      sourceName: 'Armenia Securities Exchange', sourceUrl: URLS.amx,
    });
    return { indicators: [indicator], health: health('amx', 'Armenia Securities Exchange', 'healthy', 1) };
  } catch (error) {
    const code = error instanceof FetchFailure ? error.code : 'parse';
    return { indicators: [], health: health('amx', 'Armenia Securities Exchange', 'unavailable', 0, code) };
  }
}

async function collectPsrc(): Promise<{ indicators: ArmeniaIndicator[]; health: ArmeniaIndicatorSourceHealth }> {
  try {
    const text = htmlText(await fetchText(URLS.psrc));
    const unchanged = /կմնան\s+անփոփոխ|remain(?:s|ed)?\s+unchanged|без\s+изменен/iu.test(text);
    if (!unchanged) throw new FetchFailure('parse', 'Tariff status phrase not found');
    const indicator = liveIndicator({
      id: 'electricity-tariff-status', domain: 'energy', value: 'unchanged', unit: 'status', period: '2026',
      sourceName: 'Public Services Regulatory Commission of Armenia', sourceUrl: URLS.psrc,
      note: 'Consumer electricity tariffs for 2026 are reported unchanged by the regulator.',
    });
    return { indicators: [indicator], health: health('psrc', 'Public Services Regulatory Commission of Armenia', 'healthy', 1) };
  } catch (error) {
    const code = error instanceof FetchFailure ? error.code : 'parse';
    return { indicators: [], health: health('psrc', 'Public Services Regulatory Commission of Armenia', 'unavailable', 0, code) };
  }
}

async function buildSnapshot(): Promise<ArmeniaIndicatorSnapshot> {
  const results = await Promise.all([collectCba(), collectArmstat(), collectAmx(), collectPsrc()]);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    indicators: results.flatMap((result) => result.indicators),
    sources: results.map((result) => result.health),
  };
}

export async function getArmeniaIndicatorSnapshot(
  options: { force?: boolean } = {},
): Promise<ArmeniaIndicatorSnapshot> {
  const now = Date.now();
  if (!options.force && cachedSnapshot && now - cachedAt < CACHE_TTL_MS) return cachedSnapshot;
  if (!options.force && inFlight) return inFlight;

  const build = buildSnapshot()
    .then((snapshot) => {
      cachedSnapshot = snapshot;
      cachedAt = Date.now();
      return snapshot;
    })
    .finally(() => {
      if (inFlight === build) inFlight = null;
    });
  inFlight = build;
  return build;
}
