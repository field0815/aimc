import type { EventImpact, MarketEvent } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// DB(snake_case row) <-> 도메인 모델(camelCase) 매핑
// ─────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export function rowToImpact(r: any): EventImpact {
  return {
    id: r.id,
    eventId: r.event_id,
    ticker: r.ticker,
    companyName: r.company_name,
    impactScore: r.impact_score,
    direction: r.direction ?? "unknown",
    note: r.note ?? null,
  };
}

export function rowToEvent(r: any, impactRows: any[] = []): MarketEvent {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    country: r.country,
    eventDate: r.event_date,
    eventTime: r.event_time ?? null,
    importance: r.importance,
    status: r.status,
    source: r.source,
    sourceUrl: r.source_url ?? null,
    previousValue: r.previous_value ?? null,
    expectedValue: r.expected_value ?? null,
    actualValue: r.actual_value ?? null,
    summary: r.summary ?? null,
    bullCase: r.bull_case ?? null,
    bearCase: r.bear_case ?? null,
    tradingNote: r.trading_note ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    impacts: impactRows.map(rowToImpact),
  };
}
