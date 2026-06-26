import { NextResponse } from "next/server";
import { getQuotes, isPriceSupported, PRICE_SUPPORTED } from "@/lib/prices";

// ─────────────────────────────────────────────────────────────
// GET /api/quote?tickers=NVDA,MSFT
//   요청 종목들의 "오늘 시세(가격·변동률)"를 반환.
//   지원되지 않는 종목(한국 등)은 supported:false 로 표시.
// ─────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("tickers") ?? "";
  const tickers = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const supported = tickers.filter(isPriceSupported);
  const quotes = supported.length ? await getQuotes(supported) : {};

  const result: Record<
    string,
    { supported: boolean; price?: number; changePct?: number; change?: number }
  > = {};
  for (const t of tickers) {
    if (!isPriceSupported(t)) {
      result[t] = { supported: false };
      continue;
    }
    const q = quotes[t];
    result[t] = q
      ? { supported: true, price: q.price, changePct: q.changePct, change: q.change }
      : { supported: true }; // 지원되지만 일시적으로 못 가져옴
  }

  return NextResponse.json({
    asOf: new Date().toISOString(),
    supportedUniverse: [...PRICE_SUPPORTED],
    quotes: result,
  });
}
