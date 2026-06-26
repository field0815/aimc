import type {
  EventImpact,
  ImpactDirection,
  MarketEvent,
  WatchlistItem,
} from "@/lib/types";
import { addDaysISO } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────
// 더미 데이터 — 외부 API/DB 없이 앱을 완전히 동작시키기 위한 시드.
// 날짜는 "오늘" 기준 상대 오프셋으로 생성되어, 언제 실행해도
// 오늘/이번 주/이번 달 화면에 항상 콘텐츠가 보입니다.
//
// 동일한 데이터를 SQL로 넣고 싶다면 supabase/seed.sql 을 사용하세요.
// (seed.sql 은 고정 날짜라 데모 시점에 맞게 조정 필요)
// ─────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

/** 영향도 헬퍼: [ticker, label, score, direction, note?] 튜플 배열을 EventImpact[]로 */
type ImpactTuple = [string, string, number, ImpactDirection, string?];

function impacts(eventId: string, rows: ImpactTuple[]): EventImpact[] {
  return rows.map(([ticker, companyName, impactScore, direction, note]) => ({
    id: uid("imp"),
    eventId,
    ticker,
    companyName,
    impactScore,
    direction,
    note: note ?? null,
  }));
}

type EventInput = Omit<MarketEvent, "id" | "createdAt" | "updatedAt" | "impacts"> & {
  impacts: ImpactTuple[];
};

function makeEvent(input: EventInput): MarketEvent {
  const id = uid("evt");
  return {
    ...input,
    id,
    createdAt: NOW,
    updatedAt: NOW,
    impacts: impacts(id, input.impacts),
  };
}

export const DUMMY_WATCHLIST: WatchlistItem[] = [
  { id: uid("wl"), ticker: "000660.KS", companyName: "SK hynix", sector: "Memory", priority: 1 },
  { id: uid("wl"), ticker: "005930.KS", companyName: "Samsung Electronics", sector: "Memory/Foundry", priority: 1 },
  { id: uid("wl"), ticker: "NVDA", companyName: "NVIDIA", sector: "AI GPU", priority: 1 },
  { id: uid("wl"), ticker: "AVGO", companyName: "Broadcom", sector: "AI ASIC/Networking", priority: 2 },
  { id: uid("wl"), ticker: "MU", companyName: "Micron", sector: "Memory", priority: 2 },
  { id: uid("wl"), ticker: "TSM", companyName: "TSMC", sector: "Foundry", priority: 1 },
  { id: uid("wl"), ticker: "META", companyName: "Meta", sector: "Hyperscaler", priority: 2 },
  { id: uid("wl"), ticker: "MSFT", companyName: "Microsoft", sector: "Hyperscaler", priority: 2 },
  { id: uid("wl"), ticker: "AMZN", companyName: "Amazon", sector: "Hyperscaler", priority: 2 },
  { id: uid("wl"), ticker: "GOOGL", companyName: "Alphabet", sector: "Hyperscaler", priority: 3 },
  { id: uid("wl"), ticker: "AMD", companyName: "AMD", sector: "AI GPU", priority: 3 },
];

export const DUMMY_EVENTS: MarketEvent[] = [
  // ── 과거(발표완료) ─────────────────────────────────────────
  makeEvent({
    title: "미국 5월 고용보고서 (비농업 고용/실업률)",
    category: "economic",
    country: "US",
    eventDate: addDaysISO(-5),
    eventTime: "21:30 KST",
    importance: 4,
    status: "released",
    source: "fred",
    sourceUrl: "https://fred.stlouisfed.org/series/PAYEMS",
    previousValue: "+17.5만",
    expectedValue: "+18.0만",
    actualValue: "+22.9만",
    summary:
      "비농업 고용이 예상치를 크게 상회. 고용 강세는 연준의 금리 인하 시점을 늦출 수 있어 위험자산에 단기 부담.",
    bullCase: "고용 견조 → 경기 연착륙 기대 → AI 설비투자 지속 전망 유지.",
    bearCase: "강한 고용 → 금리 인하 지연 → 고밸류 반도체/빅테크 멀티플 부담.",
    tradingNote: "발표 직후 변동성 확대. 금리 민감주(고PER 반도체) 변동 유의.",
    impacts: [
      ["NVDA", "NVIDIA", 4, "bearish", "금리 인하 지연 시 멀티플 부담"],
      ["AVGO", "Broadcom", 3, "bearish"],
      ["MSFT", "Microsoft", 3, "bearish"],
      ["AMZN", "Amazon", 3, "bearish"],
      ["005930.KS", "삼성전자", 2, "neutral"],
      ["000660.KS", "SK하이닉스", 2, "neutral"],
    ],
  }),
  makeEvent({
    title: "미국 5월 CPI (소비자물가지수)",
    category: "economic",
    country: "US",
    eventDate: addDaysISO(-2),
    eventTime: "21:30 KST",
    importance: 5,
    status: "released",
    source: "fred",
    sourceUrl: "https://fred.stlouisfed.org/series/CPIAUCSL",
    previousValue: "3.4% (YoY)",
    expectedValue: "3.4% (YoY)",
    actualValue: "3.3% (YoY)",
    summary:
      "헤드라인 CPI가 예상을 소폭 하회하며 디스인플레이션 재개 신호. 금리 인하 기대가 강화되어 위험자산 우호적.",
    bullCase: "물가 둔화 → 금리 인하 기대 → 고밸류 AI 반도체/빅테크 멀티플 우호.",
    bearCase: "근원물가 끈적임 지속 시 되돌림 가능.",
    tradingNote: "헤드라인보다 근원(Core) MoM 수치에 주목.",
    impacts: [
      ["NVDA", "NVIDIA", 5, "bullish"],
      ["AVGO", "Broadcom", 4, "bullish"],
      ["MU", "Micron", 3, "bullish"],
      ["MSFT", "Microsoft", 4, "bullish"],
      ["META", "Meta", 4, "bullish"],
      ["005930.KS", "삼성전자", 3, "bullish"],
      ["000660.KS", "SK하이닉스", 3, "bullish"],
    ],
  }),

  // ── 오늘 ──────────────────────────────────────────────────
  makeEvent({
    title: "미국 주간 신규 실업수당청구건수",
    category: "economic",
    country: "US",
    eventDate: addDaysISO(0),
    eventTime: "21:30 KST",
    importance: 2,
    status: "needs_check",
    source: "fred",
    sourceUrl: "https://fred.stlouisfed.org/series/ICSA",
    previousValue: "23.8만",
    expectedValue: "24.0만",
    actualValue: null,
    summary: "노동시장 둔화 속도 점검용 주간 지표. 단독 영향은 제한적이나 추세 확인에 활용.",
    bullCase: "청구건수 증가 → 노동시장 둔화 → 금리 인하 기대.",
    bearCase: "청구건수 급감 → 고용 강세 → 금리 인하 지연 우려.",
    tradingNote: "단일 주차보다 4주 이동평균 추세가 중요.",
    impacts: [
      ["NVDA", "NVIDIA", 2, "neutral"],
      ["MSFT", "Microsoft", 1, "neutral"],
      ["005930.KS", "삼성전자", 1, "neutral"],
    ],
  }),
  makeEvent({
    title: "마이크론(MU) 분기 실적 발표",
    category: "earnings",
    country: "US",
    eventDate: addDaysISO(0),
    eventTime: "장 마감 후 (익일 05:00 KST)",
    importance: 4,
    status: "needs_check",
    source: "fmp",
    sourceUrl: "https://site.financialmodelingprep.com/",
    previousValue: "EPS 0.42",
    expectedValue: "EPS 0.50",
    actualValue: null,
    summary:
      "HBM·DRAM 업황의 선행 지표. 마이크론 가이던스는 SK하이닉스·삼성전자 메모리 투자심리에 직접 영향.",
    bullCase: "HBM 수요 강세·가격 인상 언급 → 메모리 3사 동반 강세.",
    bearCase: "범용 DRAM 재고·가격 약세 가이던스 → 메모리주 차익실현.",
    tradingNote: "실적 자체보다 '다음 분기 가이던스'와 HBM 코멘트가 핵심. 한국 메모리주는 익일 시초가 갭 주의.",
    impacts: [
      ["MU", "Micron", 5, "unknown", "당사자"],
      ["000660.KS", "SK하이닉스", 5, "unknown", "HBM 업황 동조"],
      ["005930.KS", "삼성전자", 4, "unknown"],
      ["NVDA", "NVIDIA", 2, "neutral", "HBM 공급망"],
      ["TSM", "TSMC", 1, "neutral"],
    ],
  }),

  // ── 이번 주 (가까운 미래) ──────────────────────────────────
  makeEvent({
    title: "미국 5월 PCE 물가지수 (연준 선호 지표)",
    category: "economic",
    country: "US",
    eventDate: addDaysISO(1),
    eventTime: "21:30 KST",
    importance: 5,
    status: "scheduled",
    source: "fred",
    sourceUrl: "https://fred.stlouisfed.org/series/PCEPI",
    previousValue: "2.7% (YoY)",
    expectedValue: "2.6% (YoY)",
    actualValue: null,
    summary:
      "연준이 가장 중시하는 물가 지표. 근원 PCE 수치가 금리 인하 경로 기대를 좌우.",
    bullCase: "근원 PCE 둔화 → 9월 인하 기대 강화 → AI 반도체 랠리 연장.",
    bearCase: "PCE 예상 상회 → 인하 기대 후퇴 → 고밸류주 조정.",
    tradingNote: "FOMC 직전 주 발표라 영향 배가. 발표 전 포지션 과도 노출 주의.",
    impacts: [
      ["NVDA", "NVIDIA", 5, "unknown"],
      ["AVGO", "Broadcom", 4, "unknown"],
      ["MSFT", "Microsoft", 4, "unknown"],
      ["META", "Meta", 4, "unknown"],
      ["AMZN", "Amazon", 4, "unknown"],
      ["000660.KS", "SK하이닉스", 3, "unknown"],
      ["005930.KS", "삼성전자", 3, "unknown"],
    ],
  }),
  makeEvent({
    title: "미국 6월 ISM 제조업 PMI",
    category: "economic",
    country: "US",
    eventDate: addDaysISO(2),
    eventTime: "23:00 KST",
    importance: 3,
    status: "scheduled",
    source: "fmp",
    previousValue: "48.7",
    expectedValue: "49.1",
    actualValue: null,
    summary: "제조업 경기 확장/위축 분기점(50). 반도체 전방 수요 심리 가늠자.",
    bullCase: "50 상회 회복 → 경기 모멘텀 → 시클리컬 반도체 우호.",
    bearCase: "위축 지속 → 수요 둔화 우려.",
    tradingNote: "가격지불지수(물가)와 신규주문 세부항목 확인.",
    impacts: [
      ["MU", "Micron", 3, "unknown"],
      ["NVDA", "NVIDIA", 2, "neutral"],
      ["TSM", "TSMC", 2, "neutral"],
    ],
  }),
  makeEvent({
    title: "분기 옵션 만기일 (트리플 위칭)",
    category: "option_expiry",
    country: "US",
    eventDate: addDaysISO(4),
    eventTime: "장 마감",
    importance: 3,
    status: "scheduled",
    source: "manual",
    summary:
      "주식·지수·옵션이 동시 만기되는 날. 거래량 급증과 변동성 확대, 종가 부근 왜곡 가능.",
    bullCase: "감마 포지션에 따라 상방 쏠림 가능.",
    bearCase: "대량 롤오버/청산으로 변동성 급등 가능.",
    tradingNote: "방향성 베팅보다 변동성 자체에 주의. 막판 15분 가격 왜곡 흔함.",
    impacts: [
      ["NVDA", "NVIDIA", 3, "neutral", "고변동성 종목"],
      ["AMD", "AMD", 3, "neutral"],
      ["META", "Meta", 2, "neutral"],
    ],
  }),
  makeEvent({
    title: "TSMC 6월 월매출 발표",
    category: "earnings",
    country: "TW",
    eventDate: addDaysISO(6),
    eventTime: "오후 (현지)",
    importance: 3,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://investor.tsmc.com/",
    previousValue: "전년比 +30% 내외",
    expectedValue: null,
    actualValue: null,
    summary: "AI 가속기 파운드리 수요의 월간 체크포인트. 매출 YoY 추세가 AI 사이클 강도 신호.",
    bullCase: "월매출 YoY 가속 → AI 칩 수요 견조 확인 → 밸류체인 동반 강세.",
    bearCase: "성장 둔화 → AI 피크아웃 논쟁 자극.",
    tradingNote: "단월 변동성 큼. 3개월 추세로 판단.",
    impacts: [
      ["TSM", "TSMC", 5, "unknown", "당사자"],
      ["NVDA", "NVIDIA", 4, "unknown", "주요 고객"],
      ["AVGO", "Broadcom", 3, "unknown"],
      ["AMD", "AMD", 3, "unknown"],
    ],
  }),

  // ── 이번 달 / 다음 (먼 미래) ───────────────────────────────
  makeEvent({
    title: "삼성전자 2분기 잠정실적 발표",
    category: "kr_disclosure",
    country: "KR",
    eventDate: addDaysISO(9),
    eventTime: "오전 (장중)",
    importance: 5,
    status: "scheduled",
    source: "opendart",
    sourceUrl: "https://dart.fss.or.kr/",
    previousValue: "영업이익 6.6조",
    expectedValue: "영업이익 8조 내외(컨센서스)",
    actualValue: null,
    summary:
      "메모리 업황 반등과 HBM 진입 속도를 가늠하는 핵심 이벤트. 잠정치는 가이던스 없이 숫자만 공개.",
    bullCase: "메모리 흑자폭 확대·HBM3E 진척 → 반도체 부문 회복 확인.",
    bearCase: "파운드리 적자 지속·HBM 지연 → 실망 매물.",
    tradingNote: "잠정실적은 세부 부문 미공개. 컨퍼런스콜(말일경) 전까지 해석 주의. source=OpenDART 확정일과 대조 필요.",
    impacts: [
      ["005930.KS", "삼성전자", 5, "unknown", "당사자"],
      ["000660.KS", "SK하이닉스", 3, "unknown", "메모리 업황 동조"],
      ["MU", "Micron", 2, "neutral"],
      ["NVDA", "NVIDIA", 1, "neutral"],
    ],
  }),
  makeEvent({
    title: "FOMC 정례회의 결과 및 기자회견",
    category: "fomc",
    country: "US",
    eventDate: addDaysISO(12),
    eventTime: "익일 03:00 KST (성명) / 03:30 (회견)",
    importance: 5,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://www.federalreserve.gov/",
    previousValue: "5.25~5.50% 동결",
    expectedValue: "동결 예상",
    actualValue: null,
    summary:
      "기준금리 결정과 점도표(SEP) 발표. 연내 인하 횟수 시그널이 위험자산 전반의 방향을 좌우하는 최대 이벤트.",
    bullCase: "비둘기적 점도표(인하 시사) → 유동성 기대 → AI 반도체/빅테크 강세.",
    bearCase: "매파적 톤·인하 후퇴 → 고밸류주 급락 위험.",
    tradingNote: "성명문→점도표→파월 회견 순으로 가격이 출렁임. 단기 변동성 최대. 발표 전 무리한 베팅 금지.",
    impacts: [
      ["NVDA", "NVIDIA", 5, "unknown"],
      ["AVGO", "Broadcom", 5, "unknown"],
      ["MSFT", "Microsoft", 5, "unknown"],
      ["META", "Meta", 5, "unknown"],
      ["AMZN", "Amazon", 5, "unknown"],
      ["MU", "Micron", 4, "unknown"],
      ["000660.KS", "SK하이닉스", 4, "unknown"],
      ["005930.KS", "삼성전자", 4, "unknown"],
    ],
  }),
  makeEvent({
    title: "MSCI 분기 리뷰 리밸런싱 적용",
    category: "rebalancing",
    country: "GLOBAL",
    eventDate: addDaysISO(14),
    eventTime: "장 마감 기준",
    importance: 3,
    status: "scheduled",
    source: "manual",
    summary:
      "MSCI 지수 구성 종목 편입/편출이 발효되는 날. 패시브 자금 리밸런싱으로 종가 부근 거래량 급증.",
    bullCase: "편입 비중 확대 종목으로 패시브 매수 유입.",
    bearCase: "비중 축소·편출 종목 패시브 매도 출회.",
    tradingNote: "펀더멘털 무관한 기술적 수급. 종가 동시호가 변동성 주의.",
    impacts: [
      ["005930.KS", "삼성전자", 3, "unknown", "지수 비중 큰 종목"],
      ["000660.KS", "SK하이닉스", 3, "unknown"],
      ["TSM", "TSMC", 2, "neutral"],
    ],
  }),
  makeEvent({
    title: "SK하이닉스 2분기 실적 발표 (컨퍼런스콜)",
    category: "earnings",
    country: "KR",
    eventDate: addDaysISO(18),
    eventTime: "오전 (장중)",
    importance: 5,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://www.skhynix.com/ir/",
    previousValue: "영업이익 2.9조",
    expectedValue: "영업이익 5조+ (컨센서스)",
    actualValue: null,
    summary:
      "HBM 리더십을 확인하는 핵심 실적. NVIDIA향 HBM3E 공급 코멘트와 하반기 가이던스가 메모리 섹터 방향을 결정.",
    bullCase: "HBM 매출 비중·가격 상승·증설 계획 → 메모리 슈퍼사이클 기대.",
    bearCase: "범용 DRAM 약세·HBM 경쟁 심화 우려 → 차익실현.",
    tradingNote: "컨퍼런스콜의 HBM 캐파/고객 코멘트가 주가 핵심. 실적 컨센은 출처(증권사)별 상이 → 확인 필요.",
    impacts: [
      ["000660.KS", "SK하이닉스", 5, "unknown", "당사자"],
      ["005930.KS", "삼성전자", 4, "unknown", "HBM 경쟁/업황"],
      ["NVDA", "NVIDIA", 3, "unknown", "HBM 핵심 고객"],
      ["MU", "Micron", 3, "unknown"],
      ["TSM", "TSMC", 1, "neutral"],
    ],
  }),
  makeEvent({
    title: "NVIDIA 분기 실적 발표",
    category: "earnings",
    country: "US",
    eventDate: addDaysISO(20),
    eventTime: "장 마감 후 (익일 06:00 KST)",
    importance: 5,
    status: "scheduled",
    source: "fmp",
    sourceUrl: "https://investor.nvidia.com/",
    previousValue: "Data Center 매출 사상 최대",
    expectedValue: "매출 컨센서스 상회 기대",
    actualValue: null,
    summary:
      "AI 반도체 사이클의 바로미터. 데이터센터 매출·가이던스가 글로벌 AI 밸류체인 전체 심리를 좌우.",
    bullCase: "가이던스 컨센 상회·Blackwell 수요 강세 → AI 밸류체인 동반 랠리.",
    bearCase: "가이던스 둔화·공급 제약 언급 → AI 피크아웃 논쟁 격화, 전방위 조정.",
    tradingNote: "EPS보다 '다음 분기 매출 가이던스'가 전부. 한국 메모리주는 익일 동조 갭. 변동성 최상위.",
    impacts: [
      ["NVDA", "NVIDIA", 5, "unknown", "당사자"],
      ["AVGO", "Broadcom", 4, "unknown"],
      ["AMD", "AMD", 4, "unknown"],
      ["TSM", "TSMC", 4, "unknown"],
      ["000660.KS", "SK하이닉스", 4, "unknown", "HBM 공급사"],
      ["005930.KS", "삼성전자", 3, "unknown"],
      ["MU", "Micron", 3, "unknown"],
      ["MSFT", "Microsoft", 2, "neutral"],
    ],
  }),
  makeEvent({
    title: "엔비디아 개발자 컨퍼런스 (GTC) 기조연설",
    category: "semi_event",
    country: "US",
    eventDate: addDaysISO(22),
    eventTime: "새벽 (KST)",
    importance: 4,
    status: "scheduled",
    source: "manual",
    sourceUrl: "https://www.nvidia.com/gtc/",
    summary:
      "차세대 GPU 로드맵·신제품·파트너십이 공개되는 행사. 실적은 아니지만 AI 내러티브와 밸류체인 테마를 자극.",
    bullCase: "신규 아키텍처·강한 수요 메시지 → AI 반도체 테마 재점화.",
    bearCase: "기대 대비 밋밋 → '소문에 사고 뉴스에 판다' 차익실현.",
    tradingNote: "이벤트 드리븐 단기 테마. 기조연설 전 선반영 여부 확인. 발표 후 되돌림 흔함.",
    impacts: [
      ["NVDA", "NVIDIA", 4, "unknown", "주최"],
      ["TSM", "TSMC", 3, "unknown"],
      ["AVGO", "Broadcom", 3, "unknown"],
      ["000660.KS", "SK하이닉스", 3, "unknown", "HBM 로드맵 동조"],
      ["005930.KS", "삼성전자", 2, "neutral"],
      ["AMD", "AMD", 2, "neutral"],
    ],
  }),
  makeEvent({
    title: "Microsoft 분기 실적 발표",
    category: "earnings",
    country: "US",
    eventDate: addDaysISO(25),
    eventTime: "장 마감 후",
    importance: 4,
    status: "scheduled",
    source: "fmp",
    previousValue: "Azure 성장률 둔화 논쟁",
    expectedValue: "Azure/Capex 가이던스 주목",
    actualValue: null,
    summary:
      "하이퍼스케일러 AI 설비투자(Capex)의 핵심 신호. Capex 가이던스가 AI 반도체 수요 전망에 직접 연결.",
    bullCase: "Capex 상향·AI 매출 기여 가시화 → AI 반도체 수요 기대 강화.",
    bearCase: "Capex 동결/축소·AI 수익화 의문 → 반도체 수요 우려.",
    tradingNote: "MSFT·META·AMZN·GOOGL 실적의 Capex 합산 추세가 NVDA/메모리 수요의 선행 지표.",
    impacts: [
      ["MSFT", "Microsoft", 5, "unknown", "당사자"],
      ["NVDA", "NVIDIA", 4, "unknown", "Capex 수혜"],
      ["AVGO", "Broadcom", 3, "unknown"],
      ["000660.KS", "SK하이닉스", 3, "unknown"],
      ["AMZN", "Amazon", 2, "neutral"],
    ],
  }),
];
