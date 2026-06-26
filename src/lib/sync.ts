import { ADAPTERS, type NormalizedEvent } from "@/lib/adapters";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { MANUAL_EVENTS } from "@/lib/data/manual-events";
import { addDaysISO, todayISO } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────
// 동기화 오케스트레이터
//
// 1) 설정된 모든 어댑터에서 이벤트를 수집 (미설정 어댑터는 자동 skip)
// 2) Supabase(admin)가 있으면 upsert, 없으면 "dry-run"으로 결과만 반환
// 3) 상태 규칙 적용:
//    - 발표 당일 & 실제치 없음        -> needs_check (확인필요)
//    - 실제치 존재                    -> released   (발표완료)
//    - 그 외 미래                     -> scheduled  (예정)
// ─────────────────────────────────────────────────────────────

export interface SyncSummary {
  ran: boolean; // 실제로 DB 쓰기까지 했는지
  dryRun: boolean; // Supabase 미설정으로 수집만 했는지
  window: { from: string; to: string };
  perSource: { source: string; configured: boolean; fetched: number; error?: string }[];
  totalFetched: number;
  upserted: number;
}

/**
 * 상태 규칙 적용.
 * - 실제치 존재               -> released
 * - 어댑터가 released 로 확정  -> released (공시 등 이미 게시된 과거 사실 존중)
 * - 예정이었는데 날짜 도달    -> needs_check (발표 당일/경과 + 실측 미수신)
 * - 그 외 미래                -> scheduled
 */
function normalizeStatus(e: NormalizedEvent, today: string): NormalizedEvent["status"] {
  if (e.actualValue) return "released";
  if (e.status === "released") return "released";
  if (e.eventDate <= today) return "needs_check";
  return "scheduled";
}

export async function runSync(opts?: { days?: number }): Promise<SyncSummary> {
  const today = todayISO();
  const from = today;
  const to = addDaysISO(opts?.days ?? 45);

  const perSource: SyncSummary["perSource"] = [];
  const collected: NormalizedEvent[] = [];

  for (const adapter of ADAPTERS) {
    if (!adapter.isConfigured()) {
      perSource.push({ source: adapter.source, configured: false, fetched: 0 });
      continue;
    }
    try {
      const result = await adapter.fetchEvents({ from, to });
      perSource.push({
        source: result.source,
        configured: result.configured,
        fetched: result.fetched,
        error: result.error,
      });
      for (const ev of result.events) {
        collected.push({ ...ev, status: normalizeStatus(ev, today) });
      }
    } catch (e) {
      perSource.push({
        source: adapter.source,
        configured: true,
        fetched: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // 수동 큐레이션 이벤트 (FOMC/옵션만기/리밸런싱/실적예상일 등)
  for (const ev of MANUAL_EVENTS) {
    collected.push({ ...ev, status: normalizeStatus(ev, today) });
  }
  perSource.push({ source: "manual", configured: true, fetched: MANUAL_EVENTS.length });

  const admin = getSupabaseAdmin();
  if (!admin) {
    // Supabase 미설정 → 수집만 (dry-run). 더미 모드에서 동기화 버튼이 안전하게 작동.
    return {
      ran: false,
      dryRun: true,
      window: { from, to },
      perSource,
      totalFetched: collected.length,
      upserted: 0,
    };
  }

  // upsert: events (source + source_ref 유니크) → 반환된 id로 impacts 재구성
  let upserted = 0;
  for (const ev of collected) {
    const { impacts, sourceRef, ...row } = ev;
    const payload = {
      title: row.title,
      category: row.category,
      country: row.country,
      event_date: row.eventDate,
      event_time: row.eventTime,
      importance: row.importance,
      status: row.status,
      source: row.source,
      source_url: row.sourceUrl,
      source_ref: sourceRef,
      previous_value: row.previousValue,
      expected_value: row.expectedValue,
      actual_value: row.actualValue,
      summary: row.summary,
      bull_case: row.bullCase,
      bear_case: row.bearCase,
      trading_note: row.tradingNote,
      updated_at: new Date().toISOString(),
    };

    // 수동 upsert: events 의 (source, source_ref) 유니크 인덱스가 partial 이라
    // PostgREST 의 onConflict 추론이 불가 → select 후 update/insert 로 처리.
    const { data: existing } = await admin
      .from("events")
      .select("id")
      .eq("source", row.source)
      .eq("source_ref", sourceRef)
      .maybeSingle();

    let eventId: string | undefined;
    if (existing?.id) {
      const { error } = await admin.from("events").update(payload).eq("id", existing.id);
      if (error) {
        console.error("[sync] event update failed:", error.message);
        continue;
      }
      eventId = existing.id;
    } else {
      const { data: inserted, error } = await admin
        .from("events")
        .insert(payload)
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("[sync] event insert failed:", error?.message);
        continue;
      }
      eventId = inserted.id;
    }
    upserted += 1;

    if (eventId && impacts?.length) {
      await admin.from("event_impacts").upsert(
        impacts.map((im) => ({
          event_id: eventId,
          ticker: im.ticker,
          company_name: im.companyName,
          impact_score: im.impactScore,
          direction: im.direction,
          note: im.note ?? null,
        })),
        { onConflict: "event_id,ticker" },
      );
    }
  }

  return {
    ran: true,
    dryRun: false,
    window: { from, to },
    perSource,
    totalFetched: collected.length,
    upserted,
  };
}
