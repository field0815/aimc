import { fetchJson } from "@/lib/adapters/types";
import { getEodSeries, isPriceSupported } from "@/lib/prices";
import { addDaysISO, todayISO } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────
// 이벤트 히스토리 통계
//   "최근 N회 [이벤트]에서 [종목]이 같은 날 평균 ±몇 % 움직였나, 상승확률"
//
// 과거 이벤트 날짜:
//   - CPI/PCE/고용 → FRED release/dates (과거 realtime 창)
//   - FOMC        → 공개된 정례회의 결정일(수동 목록)
// 종목 반응: Yahoo 과거 종가로 "발표일 당일 수익률"(종가/전거래일종가-1) 계산.
//
// ⚠ 예측이 아니라 과거 경향 통계. 표본이 적고 다른 변수 영향도 큼(리스크 동반 표기).
// ─────────────────────────────────────────────────────────────

export type EventKey = "cpi" | "pce" | "employment" | "fomc";

export const EVENT_KEYS: EventKey[] = ["cpi", "pce", "employment", "fomc"];

interface EventDef {
  fredReleaseId?: number;
  staticDates?: string[]; // 과거 발표/결정일 (YYYY-MM-DD)
}

const EVENT_DEFS: Record<EventKey, EventDef> = {
  cpi: { fredReleaseId: 10 },
  pce: { fredReleaseId: 54 },
  employment: { fredReleaseId: 50 },
  // FOMC 정례회의 결정일(2일차). 공개 일정 기준.
  fomc: {
    staticDates: [
      "2024-01-31", "2024-03-20", "2024-05-01", "2024-06-12",
      "2024-07-31", "2024-09-18", "2024-11-07", "2024-12-18",
      "2025-01-29", "2025-03-19", "2025-05-07", "2025-06-18",
      "2025-07-30", "2025-09-17", "2025-10-29", "2025-12-10",
      "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17",
    ],
  },
};

/** 최근 N회 과거 이벤트 날짜 (오름차순) */
export async function getPastEventDates(event: EventKey, n: number): Promise<string[]> {
  const def = EVENT_DEFS[event];
  const today = todayISO();

  if (def.staticDates) {
    return def.staticDates
      .filter((d) => d <= today)
      .sort((a, b) => (a < b ? -1 : 1))
      .slice(-n);
  }

  if (def.fredReleaseId) {
    const key = process.env.FRED_API_KEY;
    if (!key) return [];
    const start = addDaysISO(-365 * 3); // 최근 3년
    const res = await fetchJson<{ release_dates?: { date: string }[] }>(
      `https://api.stlouisfed.org/fred/release/dates?release_id=${def.fredReleaseId}` +
        `&realtime_start=${start}&realtime_end=${today}` +
        `&include_release_dates_with_no_data=true&sort_order=asc&limit=1000&api_key=${key}&file_type=json`,
    );
    const dates = (res.data?.release_dates ?? [])
      .map((x) => x.date)
      .filter((d) => d <= today);
    return dates.slice(-n);
  }

  return [];
}

/** 정렬된 종가 시리즈에서 특정 날짜의 "당일 수익률(%)" (종가/전거래일종가-1) */
function sameDayReturn(rows: { date: string; close: number }[], dateISO: string): number | null {
  let idx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].date <= dateISO) idx = i;
    else break;
  }
  if (idx <= 0) return null;
  const cur = rows[idx].close;
  const prev = rows[idx - 1].close;
  if (!prev) return null;
  return (cur / prev - 1) * 100;
}

export interface HistoryPoint {
  date: string;
  pct: number | null;
}

export interface HistoryStats {
  count: number;
  avg: number | null;
  median: number | null;
  upCount: number;
  downCount: number;
  upProb: number | null; // 0~100
  avgUp: number | null;
  avgDown: number | null;
  best: number | null;
  worst: number | null;
}

export interface HistoryResult {
  event: EventKey;
  ticker: string;
  supported: boolean;
  points: HistoryPoint[]; // 최신순
  stats: HistoryStats;
}

function computeStats(pcts: number[]): HistoryStats {
  if (pcts.length === 0) {
    return {
      count: 0, avg: null, median: null, upCount: 0, downCount: 0,
      upProb: null, avgUp: null, avgDown: null, best: null, worst: null,
    };
  }
  const ups = pcts.filter((p) => p > 0);
  const downs = pcts.filter((p) => p < 0);
  const sorted = [...pcts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  return {
    count: pcts.length,
    avg: mean(pcts),
    median,
    upCount: ups.length,
    downCount: downs.length,
    upProb: (ups.length / pcts.length) * 100,
    avgUp: ups.length ? mean(ups) : null,
    avgDown: downs.length ? mean(downs) : null,
    best: Math.max(...pcts),
    worst: Math.min(...pcts),
  };
}

export async function getEventHistory(
  event: EventKey,
  ticker: string,
  n = 10,
): Promise<HistoryResult> {
  if (!isPriceSupported(ticker)) {
    return { event, ticker, supported: false, points: [], stats: computeStats([]) };
  }
  const dates = await getPastEventDates(event, n);
  if (dates.length === 0) {
    return { event, ticker, supported: true, points: [], stats: computeStats([]) };
  }
  const from = addDaysISO(-10, new Date(dates[0] + "T00:00:00"));
  const series = await getEodSeries(ticker, from, todayISO());

  const points: HistoryPoint[] = dates.map((d) => ({ date: d, pct: sameDayReturn(series, d) }));
  const valid = points.filter((p) => p.pct != null).map((p) => p.pct as number);

  return {
    event,
    ticker,
    supported: true,
    points: points.reverse(), // 최신순
    stats: computeStats(valid),
  };
}
