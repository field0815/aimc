import type {
  EventFilter,
  MarketEvent,
  WatchlistItem,
} from "@/lib/types";
import { SEMI_TICKERS } from "@/lib/constants";
import {
  isWithin,
  thisMonthRange,
  thisWeekRange,
  todayISO,
} from "@/lib/utils/date";
import { getSupabaseServer, useSupabase } from "@/lib/supabase/server";
import { rowToEvent } from "./mappers";
import { DUMMY_EVENTS, DUMMY_WATCHLIST } from "./dummy";

// ─────────────────────────────────────────────────────────────
// 데이터 접근 레이어 (Repository)
//
// 페이지/컴포넌트는 항상 이 모듈만 호출합니다.
// 내부적으로 Supabase가 설정돼 있으면 DB를, 아니면 더미를 사용 →
// API 키 없이도 MVP가 완전히 동작합니다.
// ─────────────────────────────────────────────────────────────

// ── 원본 로드 ────────────────────────────────────────────────

async function loadAllEvents(): Promise<MarketEvent[]> {
  if (useSupabase()) {
    const sb = getSupabaseServer();
    if (sb) {
      const { data: events, error } = await sb
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) {
        console.error("[repository] events load failed, fallback to dummy:", error.message);
        return sortEvents(DUMMY_EVENTS);
      }
      const ids = (events ?? []).map((e: { id: string }) => e.id);
      const { data: impacts } = ids.length
        ? await sb.from("event_impacts").select("*").in("event_id", ids)
        : { data: [] as unknown[] };
      const byEvent = new Map<string, unknown[]>();
      for (const im of (impacts ?? []) as { event_id: string }[]) {
        const arr = byEvent.get(im.event_id) ?? [];
        arr.push(im);
        byEvent.set(im.event_id, arr);
      }
      return sortEvents((events ?? []).map((e: { id: string }) => rowToEvent(e, byEvent.get(e.id) ?? [])));
    }
  }
  return sortEvents(DUMMY_EVENTS);
}

function sortEvents(events: MarketEvent[]): MarketEvent[] {
  return [...events].sort((a, b) => {
    if (a.eventDate !== b.eventDate) return a.eventDate < b.eventDate ? -1 : 1;
    return b.importance - a.importance;
  });
}

// ── 필터링 ───────────────────────────────────────────────────

function applyFilter(events: MarketEvent[], filter: EventFilter): MarketEvent[] {
  let result = events;

  if (filter.range && filter.range !== "all") {
    const today = todayISO();
    let start = today;
    let end = today;
    if (filter.range === "week") [start, end] = thisWeekRange();
    else if (filter.range === "month") [start, end] = thisMonthRange();
    result = result.filter((e) => isWithin(e.eventDate, start, end));
  }

  if (filter.minImportance && filter.minImportance > 1) {
    result = result.filter((e) => e.importance >= filter.minImportance!);
  }

  if (filter.categories && filter.categories.length > 0) {
    const set = new Set(filter.categories);
    result = result.filter((e) => set.has(e.category));
  }

  if (filter.status) {
    result = result.filter((e) => e.status === filter.status);
  }

  if (filter.ticker) {
    result = result.filter((e) =>
      e.impacts.some((im) => im.ticker === filter.ticker && im.impactScore > 0),
    );
  }

  if (filter.semiOnly) {
    const semi = new Set(SEMI_TICKERS);
    result = result.filter(
      (e) =>
        e.category === "semi_event" ||
        e.impacts.some((im) => semi.has(im.ticker) && im.impactScore >= 3),
    );
  }

  return result;
}

// ── 공개 API ─────────────────────────────────────────────────

export async function getEvents(filter: EventFilter = {}): Promise<MarketEvent[]> {
  const all = await loadAllEvents();
  return applyFilter(all, filter);
}

export async function getEventById(id: string): Promise<MarketEvent | null> {
  const all = await loadAllEvents();
  return all.find((e) => e.id === id) ?? null;
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  if (useSupabase()) {
    const sb = getSupabaseServer();
    if (sb) {
      const { data, error } = await sb
        .from("watchlist")
        .select("*")
        .order("priority", { ascending: true });
      // 테이블이 비어 있으면(아직 seed 안 함) 내장 목록으로 폴백
      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          ticker: r.ticker,
          companyName: r.company_name,
          sector: r.sector,
          priority: r.priority,
        }));
      }
    }
  }
  return DUMMY_WATCHLIST;
}

// ── 대시보드 셀렉터 ──────────────────────────────────────────

export interface DashboardData {
  today: string;
  brief: MarketEvent | null; // "오늘 꼭 봐야 할 것" — 10초 안에 핵심 파악용
  briefIsToday: boolean; // brief 가 오늘 이벤트인지(다가오는 일정인지)
  weekRiskScore: number; // 이번 주 위험도 (0~100)
  topRiskyThisWeek: MarketEvent[]; // 위험 이벤트 TOP 5
  todayEvents: MarketEvent[]; // 오늘 발표 예정/확인필요
  releasedWithActual: MarketEvent[]; // 발표완료 + 실제치 존재
  nextFomc: MarketEvent | null;
  nextInflation: MarketEvent | null; // 다음 CPI/PCE
  nextSemiEarnings: MarketEvent | null; // 다음 주요 반도체 실적
}

export async function getDashboard(): Promise<DashboardData> {
  const all = await loadAllEvents();
  const today = todayISO();
  const [wkStart, wkEnd] = thisWeekRange();

  const weekEvents = all.filter((e) => isWithin(e.eventDate, wkStart, wkEnd));

  const topRiskyThisWeek = [...weekEvents]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);

  const todayEvents = all.filter((e) => e.eventDate === today);

  // "오늘 핵심" 선정: 오늘 가장 중요한 이벤트 → 없으면 가장 가까운 중요(★4+) 미래 이벤트
  const todayTop = [...todayEvents].sort((a, b) => b.importance - a.importance)[0];
  const nextMajor = all
    .filter((e) => e.eventDate > today && e.importance >= 4)
    .sort((a, b) => (a.eventDate < b.eventDate ? -1 : 1))[0];
  const brief = todayTop ?? nextMajor ?? null;
  const briefIsToday = Boolean(todayTop);

  const releasedWithActual = all
    .filter((e) => e.status === "released" && e.actualValue)
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1))
    .slice(0, 8);

  // 이번 주 위험도 = 평균 중요도를 0~100으로 환산
  const weekRiskScore = weekEvents.length
    ? Math.round((weekEvents.reduce((s, e) => s + e.importance, 0) / weekEvents.length / 5) * 100)
    : 0;

  const future = all.filter((e) => e.eventDate >= today);
  const nextFomc = future.find((e) => e.category === "fomc") ?? null;
  const nextInflation =
    future.find((e) => e.category === "economic" && /CPI|PCE/i.test(e.title)) ?? null;
  const nextSemiEarnings =
    future.find(
      (e) =>
        e.category === "earnings" &&
        e.impacts.some((im) => SEMI_TICKERS.includes(im.ticker) && im.impactScore >= 4),
    ) ?? null;

  return {
    today,
    brief,
    briefIsToday,
    weekRiskScore,
    topRiskyThisWeek,
    todayEvents,
    releasedWithActual,
    nextFomc,
    nextInflation,
    nextSemiEarnings,
  };
}
