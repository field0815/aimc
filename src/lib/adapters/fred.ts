import type { DataAdapter, NormalizedEvent, SyncResult } from "./types";
import { extractApiError, fetchJson } from "./types";

// ─────────────────────────────────────────────────────────────
// FRED (St. Louis Fed) 어댑터
//   - 주요 경제지표의 "릴리스 날짜"를 보조 확인하는 용도.
//   - FMP 경제 캘린더와 교차검증해 source 충돌 시 needs_check 로 남김.
//
// 문서: https://fred.stlouisfed.org/docs/api/fred/
// 환경변수: FRED_API_KEY
// ─────────────────────────────────────────────────────────────

const BASE = "https://api.stlouisfed.org/fred";

/**
 * 추적할 릴리스 (release_id, 표시명) — 필요 시 확장.
 * release_id 는 FRED 공식값:
 *   10 = Consumer Price Index, 50 = Employment Situation,
 *   54 = Personal Income and Outlays(PCE 포함).
 * 확인: https://fred.stlouisfed.org/docs/api/fred/releases.html
 */
const RELEASES: { id: number; name: string }[] = [
  { id: 10, name: "소비자물가지수(CPI)" },
  { id: 50, name: "고용상황(Employment Situation)" },
  { id: 54, name: "개인소득·지출(PCE)" },
];

interface FredReleaseDates {
  release_dates?: { release_id: number; date: string }[];
}

export const fredAdapter: DataAdapter = {
  source: "fred",

  isConfigured() {
    return Boolean(process.env.FRED_API_KEY);
  },

  async fetchEvents({ from, to }): Promise<SyncResult> {
    const key = process.env.FRED_API_KEY;
    if (!key) {
      return { source: "fred", configured: false, fetched: 0, events: [] };
    }

    const events: NormalizedEvent[] = [];
    const errors: string[] = [];

    for (const rel of RELEASES) {
      // realtime_start~end 를 넓게 잡고 미래 예정일(no_data 포함)까지 받아온 뒤
      // 우리가 원하는 [from, to] 날짜 창으로 필터링한다.
      const res = await fetchJson<FredReleaseDates>(
        `${BASE}/release/dates?release_id=${rel.id}` +
          `&realtime_start=${from}&realtime_end=9999-12-31` +
          `&include_release_dates_with_no_data=true&sort_order=asc&limit=1000` +
          `&api_key=${key}&file_type=json`,
      );
      if (!res.ok) {
        errors.push(`release ${rel.id}: ${res.error}`);
        continue;
      }
      const apiErr = extractApiError(res.data);
      if (apiErr) errors.push(`release ${rel.id}: ${apiErr}`);
      for (const d of res.data?.release_dates ?? []) {
        if (d.date < from || d.date > to) continue;
        events.push({
          title: `${rel.name} 릴리스 예정`,
          category: "economic",
          country: "US",
          eventDate: d.date,
          eventTime: null,
          importance: 4,
          status: "scheduled",
          source: "fred",
          sourceUrl: `https://fred.stlouisfed.org/releases/${rel.id}`,
          previousValue: null,
          expectedValue: null,
          actualValue: null,
          summary: "FRED 릴리스 일정으로 날짜 보조 확인.",
          bullCase: null,
          bearCase: null,
          tradingNote: "FRED 는 발표 날짜 확인용. 실측치는 FMP/공식 발표로 보강.",
          sourceRef: `fred:${rel.id}:${d.date}`,
          impacts: [],
        });
      }
    }

    return {
      source: "fred",
      configured: true,
      fetched: events.length,
      events,
      error: errors.length ? errors.join(" | ") : undefined,
    };
  },
};
