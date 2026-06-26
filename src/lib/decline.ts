import type { MarketEvent } from "./types";

// ─────────────────────────────────────────────────────────────
// 하락 분류 시스템 ("이번 하락은 어떤 하락인가?")
//
// 시장 하락을 4가지 유형으로 분류해, 사용자가
// "그냥 흔들림"인지 "진짜 조심해야 하는 하락"인지 이해하도록 돕는다.
//
// ⚠ 이것은 예측이 아니라 "변동의 성격을 이해하는 프레임워크"다.
//   매매 신호가 아니며, 가능성/경향만 설명한다.
//
// 라벨/설명 텍스트는 i18n 사전(decline.*)에 있다.
// ─────────────────────────────────────────────────────────────

export type DeclineType =
  | "event_driven" // 이벤트성
  | "supply_demand" // 수급성
  | "structural" // 구조적
  | "company_specific"; // 기업 고유 악재

export const DECLINE_TYPES: DeclineType[] = [
  "event_driven",
  "supply_demand",
  "structural",
  "company_specific",
];

/** 유형별 색상/심각도. severity 가 높을수록 "더 주의" (1=흔들림 ~ 3=주의) */
export const DECLINE_META: Record<
  DeclineType,
  { chip: string; dot: string; severity: 1 | 2 | 3 }
> = {
  event_driven: {
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    dot: "bg-amber-400",
    severity: 1,
  },
  supply_demand: {
    chip: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
    dot: "bg-cyan-400",
    severity: 1,
  },
  structural: {
    chip: "border-red-500/40 bg-red-500/10 text-red-200",
    dot: "bg-red-400",
    severity: 3,
  },
  company_specific: {
    chip: "border-purple-500/40 bg-purple-500/10 text-purple-200",
    dot: "bg-purple-400",
    severity: 2,
  },
};

// 구조적 변화 신호 (실적 체력 자체의 변화)
const STRUCTURAL_RE =
  /가이던스\s*하향|capex|설비투자\s*(축소|감소)|수요\s*둔화|감산|점유율\s*하락|구조적|업황\s*둔화|peak\s*out|피크아웃/i;

// 개별 기업 악재 (규제/소송/제품 등)
const COMPANY_RE =
  /규제|소송|리콜|제품\s*(결함|문제|실패)|결함|횡령|배임|제재|벌금|불매|압수|기소|담합/;

/**
 * 이벤트가 유발할 수 있는 변동(하락)의 성격을 추정.
 * 우선순위: 구조적 신호 > 기업 악재 신호 > 카테고리 기본값.
 *
 * NOTE: 현재는 콘텐츠/카테고리 기반 자동 추정. 추후 events 테이블에
 * decline_type 컬럼을 두어 수동 override 를 지원할 수 있다.
 */
export function deriveDeclineType(e: MarketEvent): DeclineType {
  const text = `${e.title} ${e.summary ?? ""} ${e.bearCase ?? ""} ${e.tradingNote ?? ""}`;

  if (STRUCTURAL_RE.test(text)) return "structural";
  if (COMPANY_RE.test(text)) return "company_specific";

  switch (e.category) {
    case "option_expiry":
    case "rebalancing":
      return "supply_demand";
    case "kr_disclosure":
      return "company_specific";
    // economic / fomc / earnings / semi_event 는 "예정된 이벤트" 성격
    default:
      return "event_driven";
  }
}
