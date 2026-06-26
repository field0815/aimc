import type { EventCategory, EventStatus, ImpactDirection } from "./types";
import type { Locale } from "./i18n/config";

// ─────────────────────────────────────────────────────────────
// 색상 / 메타데이터 매핑 (텍스트 라벨은 i18n 사전으로 이동)
// ─────────────────────────────────────────────────────────────

/** 카테고리별 배지 색상 (Tailwind 클래스) */
export const CATEGORY_BADGE: Record<EventCategory, string> = {
  economic: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  fomc: "bg-red-500/15 text-red-300 border-red-500/30",
  earnings: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  kr_disclosure: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  semi_event: "bg-green-500/15 text-green-300 border-green-500/30",
  rebalancing: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  option_expiry: "bg-pink-500/15 text-pink-300 border-pink-500/30",
};

export const STATUS_BADGE: Record<EventStatus, string> = {
  scheduled: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  released: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  needs_check: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export const DIRECTION_COLOR: Record<ImpactDirection, string> = {
  bullish: "text-emerald-400",
  bearish: "text-red-400",
  neutral: "text-slate-400",
  unknown: "text-slate-500",
};

/** 국가 이모지 플래그 */
export const COUNTRY_FLAG: Record<string, string> = {
  US: "🇺🇸",
  KR: "🇰🇷",
  TW: "🇹🇼",
  GLOBAL: "🌐",
};

/** 필터/표에서 사용하는 카테고리 표시 순서 */
export const CATEGORY_ORDER: EventCategory[] = [
  "economic",
  "fomc",
  "earnings",
  "kr_disclosure",
  "semi_event",
  "rebalancing",
  "option_expiry",
];

/**
 * 거시 이벤트 카테고리 — 보유 종목과 무관하게 "모두에게 영향"을 주므로
 * 내 종목 화면에서 항상 노출한다. (금리·물가·수급 이벤트)
 */
export const MACRO_CATEGORIES: EventCategory[] = [
  "economic",
  "fomc",
  "option_expiry",
  "rebalancing",
];

/** AI/반도체 핵심 종목 (대시보드 "AI 반도체만 보기"용) */
export const SEMI_TICKERS = [
  "000660.KS",
  "005930.KS",
  "NVDA",
  "AVGO",
  "MU",
  "TSM",
  "AMD",
];

/** 종목명 현지화 (영어 모드에서 한글 회사명 대신 영문 표기) */
export const STOCK_NAMES: Record<string, { ko: string; en: string }> = {
  "000660.KS": { ko: "SK하이닉스", en: "SK hynix" },
  "005930.KS": { ko: "삼성전자", en: "Samsung" },
  NVDA: { ko: "NVIDIA", en: "NVIDIA" },
  AVGO: { ko: "Broadcom", en: "Broadcom" },
  MU: { ko: "Micron", en: "Micron" },
  TSM: { ko: "TSMC", en: "TSMC" },
  META: { ko: "Meta", en: "Meta" },
  MSFT: { ko: "Microsoft", en: "Microsoft" },
  AMZN: { ko: "Amazon", en: "Amazon" },
  GOOGL: { ko: "Alphabet", en: "Alphabet" },
  AMD: { ko: "AMD", en: "AMD" },
};

/** ticker → 현지화 종목명. 매핑에 없으면 fallback(데이터값) 사용 */
export function stockName(ticker: string, locale: Locale, fallback?: string): string {
  return STOCK_NAMES[ticker]?.[locale] ?? fallback ?? ticker;
}

/** 영향도 표를 그릴 때 사용하는 표준 종목 순서 */
export const IMPACT_COLUMNS = Object.keys(STOCK_NAMES)
  .filter((t) =>
    ["000660.KS", "005930.KS", "NVDA", "AVGO", "MU", "TSM", "META", "MSFT", "AMZN"].includes(t),
  )
  .map((ticker) => ({ ticker }));
