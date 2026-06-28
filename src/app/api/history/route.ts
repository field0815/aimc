import { NextResponse } from "next/server";
import { EVENT_KEYS, getEventHistory, type EventKey } from "@/lib/history";

// ─────────────────────────────────────────────────────────────
// GET /api/history?event=cpi&ticker=NVDA&n=10
//   과거 N회 이벤트 당일 해당 종목 수익률 + 집계 통계.
// ─────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const event = (url.searchParams.get("event") ?? "") as EventKey;
  const ticker = (url.searchParams.get("ticker") ?? "").trim();
  const n = Math.min(20, Math.max(3, Number(url.searchParams.get("n") ?? "10")));

  if (!EVENT_KEYS.includes(event) || !ticker) {
    return NextResponse.json(
      { error: "event(cpi|pce|employment|fomc) and ticker required" },
      { status: 400 },
    );
  }

  try {
    const result = await getEventHistory(event, ticker, n);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "history failed" },
      { status: 500 },
    );
  }
}
