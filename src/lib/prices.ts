import { fetchJson } from "@/lib/adapters/types";

// ─────────────────────────────────────────────────────────────
// 주가 시세 서비스 — Yahoo Finance (비공식, 무키)
//
// FMP 무료 플랜이 브로드컴/마이크론/한국 종목 시세를 막아서,
// 키 없이 전 종목(미국+한국)을 커버하는 Yahoo Finance chart 엔드포인트로 전환.
//   - quote:      /v8/finance/chart/{sym}?interval=1d&range=2d  → meta
//   - historical: /v8/finance/chart/{sym}?period1&period2&interval=1d
//   - 우리 티커 포맷(.KS 등)을 그대로 사용. 한국 종목은 KRW.
//
// ⚠ 비공식 API라 무보장(레이트리밋/스키마 변경 가능). 실패 시 graceful null.
//   손익은 % 기반이라 통화(USD/KRW) 혼재해도 계산에 무방.
// 서버 전용. 메모리 캐시(TTL)로 호출 절약.
// ─────────────────────────────────────────────────────────────

const YH = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA = "Mozilla/5.0 (compatible; AIMC/1.0)";

/** 시세 조회 대상 종목 (Yahoo 로 전 종목 커버) */
export const PRICE_SUPPORTED = new Set([
  "000660.KS",
  "005930.KS",
  "NVDA",
  "AVGO",
  "MU",
  "TSM",
  "META",
  "MSFT",
  "AMZN",
  "GOOGL",
  "AMD",
]);

export function isPriceSupported(ticker: string): boolean {
  return PRICE_SUPPORTED.has(ticker);
}

export interface Quote {
  ticker: string;
  price: number;
  changePct: number; // 당일 변동률 (%)
  change: number; // 당일 변동액 (해당 통화)
  previousClose: number;
  currency?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const QUOTE_TTL = 5 * 60 * 1000;
const quoteCache = new Map<string, { t: number; v: Quote | null }>();

export async function getQuote(ticker: string): Promise<Quote | null> {
  if (!isPriceSupported(ticker)) return null;

  const cached = quoteCache.get(ticker);
  if (cached && Date.now() - cached.t < QUOTE_TTL) return cached.v;

  const res = await fetchJson<any>(
    `${YH}/${encodeURIComponent(ticker)}?interval=1d&range=2d`,
    { headers: { "User-Agent": UA } },
  );
  let quote: Quote | null = null;
  const m = res.data?.chart?.result?.[0]?.meta;
  if (m && typeof m.regularMarketPrice === "number") {
    const price = m.regularMarketPrice;
    const prev =
      typeof m.chartPreviousClose === "number"
        ? m.chartPreviousClose
        : typeof m.previousClose === "number"
          ? m.previousClose
          : price;
    const change = price - prev;
    quote = {
      ticker,
      price,
      previousClose: prev,
      change,
      changePct: prev ? (change / prev) * 100 : 0,
      currency: m.currency,
    };
  }
  quoteCache.set(ticker, { t: Date.now(), v: quote });
  return quote;
}

export async function getQuotes(tickers: string[]): Promise<Record<string, Quote | null>> {
  const out: Record<string, Quote | null> = {};
  for (const t of tickers) out[t] = await getQuote(t);
  return out;
}

// ── 과거 종가 (EOD) ───────────────────────────────────────────

const EOD_TTL = 60 * 60 * 1000;
const eodCache = new Map<string, { t: number; rows: { date: string; close: number }[] }>();

function unix(dateISO: string): number {
  return Math.floor(new Date(dateISO + "T00:00:00Z").getTime() / 1000);
}

/** [from, to] 구간의 일별 종가 (오름차순). 캐시됨. */
export async function getEodSeries(
  ticker: string,
  from: string,
  to: string,
): Promise<{ date: string; close: number }[]> {
  if (!isPriceSupported(ticker)) return [];

  const cacheKey = `${ticker}:${from}:${to}`;
  const cached = eodCache.get(cacheKey);
  if (cached && Date.now() - cached.t < EOD_TTL) return cached.rows;

  const p1 = unix(from);
  const p2 = unix(to) + 86400; // to 당일 포함
  const res = await fetchJson<any>(
    `${YH}/${encodeURIComponent(ticker)}?period1=${p1}&period2=${p2}&interval=1d`,
    { headers: { "User-Agent": UA } },
  );
  let rows: { date: string; close: number }[] = [];
  const r = res.data?.chart?.result?.[0];
  if (r?.timestamp && r?.indicators?.quote?.[0]?.close) {
    const ts: number[] = r.timestamp;
    const cl: (number | null)[] = r.indicators.quote[0].close;
    rows = ts
      .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: cl[i] }))
      .filter((x): x is { date: string; close: number } => typeof x.close === "number")
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  eodCache.set(cacheKey, { t: Date.now(), rows });
  return rows;
}

/** 특정 날짜의 종가(없으면 그 이전 가장 가까운 거래일 종가) */
export function closeOnOrBefore(
  rows: { date: string; close: number }[],
  dateISO: string,
): number | null {
  let result: number | null = null;
  for (const r of rows) {
    if (r.date <= dateISO) result = r.close;
    else break;
  }
  return result;
}
