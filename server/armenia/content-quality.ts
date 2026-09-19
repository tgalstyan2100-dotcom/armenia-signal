import type { ArmeniaSourceProvenance } from '../../src/types/armenia-signal';
import type { RawArmeniaArticle } from './source-adapters';

export interface ArmeniaContentQualityAssessment {
  accepted: boolean;
  qualityScore: number;
  reasons: string[];
}

const HARD_REJECT_PATTERNS: readonly RegExp[] = [
  /^untitled(?:\s|$)/i,
  /^ministry structure(?:\s|$)/i,
  /^office of the prime minister of the republic of armenia(?:\s|$)/i,
  /^republic of armenia ministry of (?:environment|economy|finance|defence|defense)(?:\s|$)/i,
  /(?:^|\s)(?:home|homepage|site map|sitemap)(?:\s|$)/i,
  /(?:պաշտոնի անձնագիր|թափուր պաշտոն|մրցույթի հայտարարություն)/iu,
  /(?:job description|vacancy announcement|position passport)/i,
  /(?:должностн.*паспорт|ваканси|объявлен.*конкурс)/iu,
];

const SOFT_LOW_VALUE_PATTERNS: readonly RegExp[] = [
  /(?:annual meeting|board of trustees|credentials|anniversary|medalists|courtesy visit|roads? are passable|weather in armenia)/i,
  /(?:հոբելյան|հավատարմագր|պարգևատրվ|աշխատանքային հանդիպում|ճանապարհները? անցանելի|եղանակը? Հայաստանում)/iu,
  /(?:юбиле|верительн.*грамот|рабоч.*встреч)/iu,
];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function visibleCharacterRatio(value: string): number {
  const compact = value.replace(/\s/g, '');
  if (!compact) return 0;
  const meaningful = [...compact].filter((char) => /[\p{L}\p{N}]/u.test(char)).length;
  return meaningful / [...compact].length;
}

function isOfficial(provenance: ArmeniaSourceProvenance): boolean {
  return provenance === 'official-primary' || provenance === 'official-data';
}

export function assessArmeniaArticleQuality(
  article: RawArmeniaArticle,
): ArmeniaContentQualityAssessment {
  const title = article.title.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const reasons: string[] = [];

  if (title.length < 10) {
    return { accepted: false, qualityScore: 0, reasons: ['title-too-short'] };
  }

  if (HARD_REJECT_PATTERNS.some((pattern) => pattern.test(title))) {
    return { accepted: false, qualityScore: 0, reasons: ['static-or-administrative-page'] };
  }

  const meaningfulRatio = visibleCharacterRatio(title);
  if (meaningfulRatio < 0.45) {
    return { accepted: false, qualityScore: 0, reasons: ['symbol-heavy-title'] };
  }

  let score = 88;

  if (article.transport === 'google-news-site') {
    score -= 8;
    reasons.push('google-news-discovery');
    if (!article.publishedAtVerified) {
      score -= isOfficial(article.source.provenance) ? 16 : 10;
      reasons.push('origin-date-unverified');
    }
  }

  if (SOFT_LOW_VALUE_PATTERNS.some((pattern) => pattern.test(title))) {
    score -= 20;
    reasons.push('low-decision-value-format');
  }

  if (title.length > 220) {
    score -= 8;
    reasons.push('overlong-title');
  }

  if (article.summary && article.summary === article.title) {
    score -= 4;
  }

  return {
    accepted: score >= 45,
    qualityScore: clamp(score),
    reasons,
  };
}

export function armeniaFreshnessScore(
  article: RawArmeniaArticle,
  nowMs = Date.now(),
): number {
  const raw = article.publishedAt ?? article.discoveredAt ?? article.observedAt;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return 20;
  const ageHours = Math.max(0, (nowMs - timestamp) / 3_600_000);

  let score: number;
  if (ageHours <= 3) score = 100;
  else if (ageHours <= 12) score = 94;
  else if (ageHours <= 24) score = 88;
  else if (ageHours <= 48) score = 78;
  else if (ageHours <= 72) score = 68;
  else if (ageHours <= 168) score = 52;
  else if (ageHours <= 336) score = 30;
  else score = 10;

  // Google News' feed date is a discovery/crawl timestamp, not an origin
  // publication timestamp. It can help with freshness, but must never create a
  // 100/100 "fresh" signal for a re-indexed old PDF or static page.
  if (article.transport === 'google-news-site' && !article.publishedAtVerified) {
    score = Math.min(score, 58);
  }
  return clamp(score);
}
