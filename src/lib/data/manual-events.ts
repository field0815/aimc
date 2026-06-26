import type { NormalizedEvent } from "@/lib/adapters/types";

// ─────────────────────────────────────────────────────────────
// 수동 핵심 이벤트 (source = "manual")
//
// FMP/FRED/OpenDART 가 제공하지 않는 거시·예정 이벤트를 사람이 큐레이션해 넣는다.
//   - FOMC, 옵션만기(트리플 위칭), MSCI 리밸런싱
//   - 한국 메모리 3사 실적 "예상일" (OpenDART 는 사후 공시만 줌)
//   - 잭슨홀 등 중앙은행 이벤트
//
// 동기화(runSync) 시 어댑터 결과와 함께 upsert 된다(idempotent, sourceRef 기준).
// 날짜/숫자는 운영 시 실제 일정·컨센서스로 갱신해야 한다.
// ─────────────────────────────────────────────────────────────

type ManualImpact = NonNullable<NormalizedEvent["impacts"]>[number];

const NINE = (
  rows: [string, string, number, ManualImpact["direction"], string?][],
): ManualImpact[] =>
  rows.map(([ticker, companyName, impactScore, direction, note]) => ({
    ticker,
    companyName,
    impactScore,
    direction,
    note,
  }));

export const MANUAL_EVENTS: NormalizedEvent[] = [
  {
    title: "FOMC 정례회의 결과 및 기자회견",
    category: "fomc",
    country: "US",
    eventDate: "2026-07-29",
    eventTime: "익일 03:00 KST (성명) / 03:30 (회견)",
    importance: 5,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    previousValue: "동결",
    expectedValue: "시장 컨센서스 확인 필요",
    actualValue: null,
    summary:
      "기준금리 결정과 점도표(SEP)·파월 회견. 연내 인하 경로 시그널이 위험자산 전반의 방향을 좌우하는 최대 거시 이벤트.",
    bullCase: "비둘기적 톤(인하 시사) → 유동성 기대 → AI 반도체/빅테크 멀티플 우호.",
    bearCase: "매파적 톤·인하 후퇴 → 고밸류 성장주 급락 위험.",
    tradingNote:
      "성명문 → 점도표 → 파월 회견 순으로 가격이 출렁임. 발표 전 무리한 베팅 금지. 모든 보유 종목에 영향.",
    sourceRef: "manual:fomc-2026-07",
    impacts: NINE([
      ["NVDA", "NVIDIA", 5, "unknown"],
      ["AVGO", "Broadcom", 5, "unknown"],
      ["MSFT", "Microsoft", 5, "unknown"],
      ["META", "Meta", 5, "unknown"],
      ["AMZN", "Amazon", 5, "unknown"],
      ["MU", "Micron", 4, "unknown"],
      ["000660.KS", "SK하이닉스", 4, "unknown"],
      ["005930.KS", "삼성전자", 4, "unknown"],
      ["TSM", "TSMC", 4, "unknown"],
    ]),
  },
  {
    title: "삼성전자 2분기 잠정실적 발표 (예상일)",
    category: "earnings",
    country: "KR",
    eventDate: "2026-07-08",
    eventTime: "오전 (장중)",
    importance: 5,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://www.samsung.com/global/ir/",
    previousValue: "직전 분기 영업이익 참고",
    expectedValue: "컨센서스 확인 필요",
    actualValue: null,
    summary:
      "메모리 업황 반등과 HBM 진입 속도를 가늠하는 핵심 이벤트. 잠정치는 가이던스 없이 숫자만 공개되며, 세부는 말일경 컨퍼런스콜에서.",
    bullCase: "메모리 흑자폭 확대·HBM3E 진척 → 반도체 부문 회복 확인.",
    bearCase: "파운드리 적자 지속·HBM 지연 → 실망 매물.",
    tradingNote: "예상일은 변동 가능. 확정일은 OpenDART 공시와 대조 필요(source=manual).",
    sourceRef: "manual:samsung-2q-2026",
    impacts: NINE([
      ["005930.KS", "삼성전자", 5, "unknown", "당사자"],
      ["000660.KS", "SK하이닉스", 3, "unknown", "메모리 업황 동조"],
      ["MU", "Micron", 2, "neutral"],
      ["NVDA", "NVIDIA", 1, "neutral"],
    ]),
  },
  {
    title: "SK하이닉스 2분기 실적 발표 (예상일·컨퍼런스콜)",
    category: "earnings",
    country: "KR",
    eventDate: "2026-07-24",
    eventTime: "오전 (장중)",
    importance: 5,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://www.skhynix.com/ir/",
    previousValue: "직전 분기 영업이익 참고",
    expectedValue: "컨센서스 확인 필요",
    actualValue: null,
    summary:
      "HBM 리더십을 확인하는 핵심 실적. NVIDIA향 HBM3E 공급 코멘트와 하반기 가이던스가 메모리 섹터 방향을 결정.",
    bullCase: "HBM 매출 비중·가격 상승·증설 계획 → 메모리 슈퍼사이클 기대.",
    bearCase: "범용 DRAM 약세·HBM 경쟁 심화 우려 → 차익실현.",
    tradingNote: "컨퍼런스콜의 HBM 캐파/고객 코멘트가 주가 핵심. 컨센은 증권사별 상이 → 확인 필요.",
    sourceRef: "manual:skhynix-2q-2026",
    impacts: NINE([
      ["000660.KS", "SK하이닉스", 5, "unknown", "당사자"],
      ["005930.KS", "삼성전자", 4, "unknown", "HBM 경쟁/업황"],
      ["NVDA", "NVIDIA", 3, "unknown", "HBM 핵심 고객"],
      ["MU", "Micron", 3, "unknown"],
    ]),
  },
  {
    title: "잭슨홀 경제정책 심포지엄",
    category: "fomc",
    country: "US",
    eventDate: "2026-08-21",
    eventTime: "심포지엄 기간 중 의장 연설",
    importance: 4,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://www.kansascityfed.org/research/jackson-hole-economic-symposium/",
    previousValue: null,
    expectedValue: null,
    actualValue: null,
    summary:
      "연준 의장 연설로 통화정책 기조 힌트가 나오는 거시 이벤트. 금리 경로 기대를 흔들어 위험자산 변동성 유발.",
    bullCase: "완화적 시그널 → 인하 기대 강화 → 성장주 우호.",
    bearCase: "물가 경계·긴축 유지 톤 → 고밸류주 부담.",
    tradingNote: "연설 원문 톤이 핵심. 헤드라인에 단기 급반응 잦음. 모든 보유 종목에 영향.",
    sourceRef: "manual:jacksonhole-2026",
    impacts: NINE([
      ["NVDA", "NVIDIA", 4, "unknown"],
      ["MSFT", "Microsoft", 4, "unknown"],
      ["AVGO", "Broadcom", 3, "unknown"],
      ["000660.KS", "SK하이닉스", 3, "unknown"],
      ["005930.KS", "삼성전자", 3, "unknown"],
    ]),
  },
  {
    title: "MSCI 분기 리뷰 리밸런싱 적용",
    category: "rebalancing",
    country: "GLOBAL",
    eventDate: "2026-08-26",
    eventTime: "장 마감 기준",
    importance: 3,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://www.msci.com/index-review",
    previousValue: null,
    expectedValue: null,
    actualValue: null,
    summary:
      "MSCI 지수 편입/편출이 발효되는 날. 패시브 자금 리밸런싱으로 종가 부근 거래량이 급증하는 수급 이벤트.",
    bullCase: "편입 비중 확대 종목으로 패시브 매수 유입.",
    bearCase: "비중 축소·편출 종목 패시브 매도 출회.",
    tradingNote: "펀더멘털 무관한 기술적 수급. 종가 동시호가 변동성 주의.",
    sourceRef: "manual:msci-2026-08",
    impacts: NINE([
      ["005930.KS", "삼성전자", 3, "unknown", "지수 비중 큰 종목"],
      ["000660.KS", "SK하이닉스", 3, "unknown"],
      ["TSM", "TSMC", 2, "neutral"],
    ]),
  },
  {
    title: "분기 옵션 만기일 (트리플 위칭)",
    category: "option_expiry",
    country: "US",
    eventDate: "2026-09-18",
    eventTime: "장 마감",
    importance: 3,
    status: "scheduled",
    source: "manual",
    sourceUrl: null,
    previousValue: null,
    expectedValue: null,
    actualValue: null,
    summary:
      "주식·지수·옵션이 동시 만기되는 날. 거래량 급증과 변동성 확대, 종가 부근 가격 왜곡 가능.",
    bullCase: "감마 포지션에 따라 상방 쏠림 가능.",
    bearCase: "대량 롤오버/청산으로 변동성 급등 가능.",
    tradingNote: "방향성 베팅보다 변동성 자체에 주의. 막판 15분 가격 왜곡 흔함.",
    sourceRef: "manual:opex-2026-09",
    impacts: NINE([
      ["NVDA", "NVIDIA", 3, "neutral", "고변동성 종목"],
      ["AMD", "AMD", 3, "neutral"],
      ["META", "Meta", 2, "neutral"],
    ]),
  },
];
