import type { DataAdapter, NormalizedEvent, SyncResult } from "./types";
import { fetchJson } from "./types";
import { addDaysISO, todayISO } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────
// OpenDART (금융감독원 전자공시) 어댑터
//   - SK하이닉스/삼성전자 등 한국 기업의 최근 공시를 수집.
//   - 실적/주요사항 공시를 kr_disclosure 카테고리로 정규화.
//
// ⚠ 공시는 "이미 게시된 과거 사실"이라 미래 창으로 조회하면 항상 0건.
//   → 동기화 창과 무관하게 "최근 N일" 과거 창으로 조회한다.
//   또한 임원·주요주주 소유상황 등 루틴 공시는 노이즈라 제외한다.
//
// 문서: https://opendart.fss.or.kr/guide/main.do
// 환경변수: OPENDART_API_KEY
// ─────────────────────────────────────────────────────────────

/** 과거 며칠치 공시를 가져올지 */
const LOOKBACK_DAYS = 30;

const BASE = "https://opendart.fss.or.kr/api";

/** 추적 기업 corp_code (OpenDART 고유코드) */
const CORPS: { corpCode: string; ticker: string; name: string }[] = [
  { corpCode: "00164779", ticker: "000660.KS", name: "SK하이닉스" },
  { corpCode: "00126380", ticker: "005930.KS", name: "삼성전자" },
];

interface DartList {
  status: string;
  message: string;
  list?: {
    corp_name: string;
    report_nm: string;
    rcept_no: string;
    rcept_dt: string; // YYYYMMDD
  }[];
}

function ymdToIso(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/** 투자 캘린더에 노이즈가 되는 루틴 공시(제외 대상) */
const SKIP_PATTERNS =
  /(소유상황보고서|대량보유상황보고서|특정증권등소유|임원ㆍ주요주주|주식등의대량보유)/;

/** 공시 제목으로 포함 여부/중요도/실적 여부 추정 */
function classify(reportName: string): {
  include: boolean;
  importance: number;
  isEarnings: boolean;
} {
  if (SKIP_PATTERNS.test(reportName)) {
    return { include: false, importance: 0, isEarnings: false };
  }
  if (/(영업\(잠정\)|잠정실적|매출액|손익구조|결산실적)/.test(reportName)) {
    return { include: true, importance: 5, isEarnings: true };
  }
  if (/(주요사항|유상증자|자기주식|합병|분할|공급계약|단일판매|현금ㆍ현물배당|배당)/.test(reportName)) {
    return { include: true, importance: 4, isEarnings: false };
  }
  if (/(사업보고서|분기보고서|반기보고서)/.test(reportName)) {
    return { include: true, importance: 4, isEarnings: false };
  }
  return { include: true, importance: 3, isEarnings: false };
}

export const opendartAdapter: DataAdapter = {
  source: "opendart",

  isConfigured() {
    return Boolean(process.env.OPENDART_API_KEY);
  },

  async fetchEvents({ from, to }): Promise<SyncResult> {
    const key = process.env.OPENDART_API_KEY;
    if (!key) {
      return { source: "opendart", configured: false, fetched: 0, events: [] };
    }

    // 공시는 과거 사실이므로 [오늘-LOOKBACK, 오늘] 창으로 조회 (전달된 미래 창 무시).
    const bgnDe = addDaysISO(-LOOKBACK_DAYS).replaceAll("-", "");
    const endDe = todayISO().replaceAll("-", "");
    void from;
    void to;
    const events: NormalizedEvent[] = [];
    const errors: string[] = [];

    for (const corp of CORPS) {
      const res = await fetchJson<DartList>(
        `${BASE}/list.json?crtfc_key=${key}&corp_code=${corp.corpCode}` +
          `&bgn_de=${bgnDe}&end_de=${endDe}&page_count=100`,
      );
      if (!res.ok) {
        errors.push(`${corp.name}: ${res.error}`);
        continue;
      }
      const data = res.data;
      // 상태코드: 000=정상, 013=데이터 없음(정상), 그 외=오류(키/쿼터 등)
      if (!data || (data.status !== "000" && data.status !== "013")) {
        errors.push(`${corp.name}: [${data?.status}] ${data?.message ?? "unknown"}`);
        continue;
      }

      for (const item of data.list ?? []) {
        const { include, importance, isEarnings } = classify(item.report_nm);
        if (!include) continue; // 루틴 공시(소유상황 등) 제외
        events.push({
          title: `[${corp.name}] ${item.report_nm.trim()}`,
          category: isEarnings ? "earnings" : "kr_disclosure",
          country: "KR",
          eventDate: ymdToIso(item.rcept_dt),
          eventTime: null,
          importance,
          status: "released", // 공시는 이미 게시된 사실
          source: "opendart",
          sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
          previousValue: null,
          expectedValue: null,
          actualValue: null,
          summary: "OpenDART 공시 자동 수집.",
          bullCase: null,
          bearCase: null,
          tradingNote: "공시 원문 링크에서 세부 내용 확인 필요.",
          sourceRef: `dart:${item.rcept_no}`,
          impacts: [
            { ticker: corp.ticker, companyName: corp.name, impactScore: 4, direction: "unknown", note: "당사자" },
          ],
        });
      }
    }

    return {
      source: "opendart",
      configured: true,
      fetched: events.length,
      events,
      error: errors.length ? errors.join(" | ") : undefined,
    };
  },
};
