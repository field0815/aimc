// ─────────────────────────────────────────────────────────────
// 도메인 타입 정의
// DB(Supabase) 스키마와 1:1로 대응됩니다. (supabase/schema.sql 참고)
// ─────────────────────────────────────────────────────────────

/** 이벤트 카테고리 */
export type EventCategory =
  | "economic" // 경제지표
  | "fomc" // FOMC
  | "earnings" // 실적
  | "kr_disclosure" // 한국공시
  | "semi_event" // 반도체행사
  | "rebalancing" // 리밸런싱
  | "option_expiry"; // 옵션만기

/** 이벤트 상태 */
export type EventStatus =
  | "scheduled" // 예정
  | "released" // 발표완료
  | "needs_check"; // 확인필요

/** 종목 영향 방향 */
export type ImpactDirection = "bullish" | "bearish" | "neutral" | "unknown";

/** 데이터 출처 종류 */
export type EventSource =
  | "manual" // 수동 입력 테이블
  | "fmp"
  | "fred"
  | "opendart";

/** 종목별 영향도 */
export interface EventImpact {
  id: string;
  eventId: string;
  ticker: string;
  companyName: string;
  /** 0~5 */
  impactScore: number;
  direction: ImpactDirection;
  note?: string | null;
}

/** 캘린더 이벤트 */
export interface MarketEvent {
  id: string;
  title: string;
  category: EventCategory;
  country: string; // "US" | "KR" | "TW" | "GLOBAL" 등
  eventDate: string; // YYYY-MM-DD
  eventTime?: string | null; // "21:30 KST" 같은 자유 텍스트
  importance: number; // 1~5
  status: EventStatus;
  source: EventSource;
  sourceUrl?: string | null;
  previousValue?: string | null;
  expectedValue?: string | null;
  actualValue?: string | null;
  summary?: string | null;
  bullCase?: string | null;
  bearCase?: string | null;
  tradingNote?: string | null;
  createdAt: string;
  updatedAt: string;
  impacts: EventImpact[];
}

/** 관심 종목 */
export interface WatchlistItem {
  id: string;
  ticker: string;
  companyName: string;
  sector: string;
  priority: number;
}

/** 이벤트 목록 필터 */
export interface EventFilter {
  range?: "today" | "week" | "month" | "all";
  minImportance?: number;
  categories?: EventCategory[];
  ticker?: string;
  status?: EventStatus;
  semiOnly?: boolean;
}
