import { SEMI_TICKERS } from "@/lib/constants";
import type { DataAdapter, NormalizedEvent, SyncResult } from "./types";
import { extractApiError, fetchJson } from "./types";

// 참고: FMP 무료 플랜은 과거 'from' 의 실적 캘린더가 Premium 잠금이라
// 미래(today~to) 구간만 수집한다. (과거 실적은 유료 플랜 필요)

// ─────────────────────────────────────────────────────────────
// FMP (Financial Modeling Prep) 어댑터  — "stable" API 기준
//   - earnings-calendar : 실적 발표일 (관심 종목만 수집)
//   경제지표는 FRED 가 담당하므로 FMP economic-calendar 는 사용하지 않는다.
//
// ⚠ v3 의 earning_calendar 는 2025-08-31 폐기(Legacy).
//   stable 엔드포인트와 신규 필드명(epsActual/epsEstimated 등)을 사용한다.
//   응답 필드는 실제 API 호출로 검증됨(2026-06).
//
// 문서: https://site.financialmodelingprep.com/developer/docs/stable/earnings-calendar
// 환경변수: FMP_API_KEY
// ─────────────────────────────────────────────────────────────

const BASE = "https://financialmodelingprep.com/stable";

/** FMP 관심 종목 (관심 종목 중 미국/대만 상장 티커) */
const TRACKED = ["NVDA", "AVGO", "MU", "TSM", "META", "MSFT", "AMZN", "GOOGL", "AMD"];

interface FmpEarnings {
  symbol: string;
  date: string; // YYYY-MM-DD
  epsActual?: number | null;
  epsEstimated?: number | null;
  revenueActual?: number | null;
  revenueEstimated?: number | null;
  lastUpdated?: string;
}

export const fmpAdapter: DataAdapter = {
  source: "fmp",

  isConfigured() {
    return Boolean(process.env.FMP_API_KEY);
  },

  async fetchEvents({ from, to }): Promise<SyncResult> {
    const key = process.env.FMP_API_KEY;
    if (!key) {
      return { source: "fmp", configured: false, fetched: 0, events: [] };
    }

    const events: NormalizedEvent[] = [];
    const errors: string[] = [];

    // 1) 실적 캘린더 (주력) ──────────────────────────────────
    const earnRes = await fetchJson<FmpEarnings[]>(
      `${BASE}/earnings-calendar?from=${from}&to=${to}&apikey=${key}`,
    );
    const earnApiErr = earnRes.ok ? extractApiError(earnRes.data) : earnRes.error;
    if (earnApiErr) errors.push(`earnings: ${earnApiErr}`);

    const earnings = Array.isArray(earnRes.data) ? earnRes.data : [];
    for (const e of earnings) {
      if (!TRACKED.includes(e.symbol)) continue;
      const hasActual = e.epsActual != null;
      events.push({
        title: `${e.symbol} 실적 발표`,
        category: "earnings",
        country: e.symbol === "TSM" ? "TW" : "US",
        eventDate: e.date,
        eventTime: null,
        importance: SEMI_TICKERS.includes(e.symbol) ? 5 : 4,
        status: hasActual ? "released" : "scheduled",
        source: "fmp",
        sourceUrl: "https://site.financialmodelingprep.com/",
        previousValue: null,
        expectedValue: e.epsEstimated != null ? `EPS ${e.epsEstimated}` : null,
        actualValue: e.epsActual != null ? `EPS ${e.epsActual}` : null,
        summary: null,
        bullCase: null,
        bearCase: null,
        tradingNote: "FMP 실적 캘린더 자동 수집. 확정일은 IR 공지와 대조 필요.",
        sourceRef: `fmp:earn:${e.symbol}:${e.date}`,
        impacts: [
          { ticker: e.symbol, companyName: e.symbol, impactScore: 5, direction: "unknown", note: "당사자" },
        ],
      });
    }

    // 경제지표는 FMP 가 아니라 FRED 가 담당한다.
    //   - FMP economic-calendar 는 미국 채권입찰·시추 카운트 등 저가치 항목이 수백 건
    //     쏟아져 캘린더를 오염시키고, FRED 의 큐레이팅된 핵심 릴리스와 중복된다.
    //   → 의도적으로 수집하지 않는다. (역할 분리: FMP=실적, FRED=경제지표)

    return {
      source: "fmp",
      configured: true,
      fetched: events.length,
      events,
      error: errors.length ? errors.join(" | ") : undefined,
    };
  },
};
