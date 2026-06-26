import { NextResponse } from "next/server";
import { getEvents } from "@/lib/data/repository";
import { closeOnOrBefore, getEodSeries, isPriceSupported } from "@/lib/prices";
import { todayISO } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────
// GET /api/seed-sim?ticker=NVDA&entry=2026-06-01
//
// "투자시점(entry)"부터, 해당 종목에 영향 주는 이벤트(뉴스) 발표일마다
// 그날 종가 기준 손익률(투자시점 종가 대비)을 계산해 반환한다.
//   - 미국 종목만 지원(시세 제약). 한국 종목은 supported:false.
//   - 미래 이벤트는 종가가 없으므로 pnlPct=null (예정).
// 금액 환산(투자금 × pnlPct)은 클라이언트에서 처리.
// ─────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") ?? "").trim();
  const entry = (url.searchParams.get("entry") ?? "").trim();
  const today = todayISO();

  if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(entry)) {
    return NextResponse.json({ error: "ticker and entry(YYYY-MM-DD) required" }, { status: 400 });
  }
  if (!isPriceSupported(ticker)) {
    return NextResponse.json({ ticker, entry, supported: false, points: [] });
  }

  // 해당 종목에 영향 주는 이벤트(전체) 중 투자시점 이후
  const events = (await getEvents({ ticker, range: "all" }))
    .filter((e) => e.eventDate >= entry)
    .sort((a, b) => (a.eventDate < b.eventDate ? -1 : 1));

  // 시세 구간: 투자시점 ~ 오늘
  const series = await getEodSeries(ticker, entry, today);
  const entryClose = closeOnOrBefore(series, entry);

  if (!entryClose) {
    return NextResponse.json({ ticker, entry, supported: true, entryClose: null, points: [] });
  }

  const points = events.map((e) => {
    const isPast = e.eventDate <= today;
    const close = isPast ? closeOnOrBefore(series, e.eventDate) : null;
    const pnlPct = close != null ? (close / entryClose - 1) * 100 : null;
    const impact = e.impacts.find((im) => im.ticker === ticker);
    return {
      eventId: e.id,
      title: e.title,
      date: e.eventDate,
      importance: e.importance,
      impactScore: impact?.impactScore ?? null,
      close,
      pnlPct,
      pending: !isPast,
    };
  });

  // 오늘 시점(최신 종가) 손익도 맨 끝에 한 줄
  const lastClose = series.length ? series[series.length - 1].close : null;
  const nowPnlPct = lastClose != null ? (lastClose / entryClose - 1) * 100 : null;

  return NextResponse.json({
    ticker,
    entry,
    supported: true,
    entryClose,
    lastClose,
    nowPnlPct,
    points,
  });
}
