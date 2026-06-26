import { fetchJson } from "@/lib/adapters/types";

// ─────────────────────────────────────────────────────────────
// 주가 시세 서비스 (FMP)
//
// ⚠ 무료 플랜 제약(실측 확인 2026-06):
//   - quote/historical 이 "종목별로" 허용 여부가 다름.
//     됨:   NVDA, TSM, META, MSFT, AMZN, GOOGL, AMD
//     안됨: AVGO(브로드컴), MU(마이크론) → Premium 잠금
//   - 한국 종목(000660.KS, 005930.KS): Premium 잠금
//   - 배치(comma) quote: Premium → 단일 종목씩 호출
//   유료 플랜으로 올리면 PRICE_SUPPORTED 에 AVGO/MU/한국종목 추가하면 됨.
//
// 호출 수 절약을 위해 메모리 캐시(TTL)를 둔다. 서버 전용.
// ─────────────────────────────────────────────────────────────

const BASE = "https://financialmodelingprep.com/stable";

/** 시세 조회가 가능한(현 무료 플랜에서 실측 확인된) 종목 */
export const PRICE_SUPPORTED = new Set([
  "NVDA",
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
  change: number; // 당일 변동액
  previousClose: number;
}

interface FmpQuote {
  symbol: string;
  price: number;
  changePercentage: number;
  change: number;
  previousClose: number;
}

const QUOTE_TTL = 5 * 60 * 1000; // 5분
const quoteCache = new Map<string, { t: number; v: Quote | null }>();

export async function getQuote(ticker: string): Promise<Quote | null> {
  if (!isPriceSupported(ticker)) return null;
  const key = process.env.FMP_API_KEY;
  if (!key) return null;

  const cached = quoteCache.get(ticker);
  if (cached && Date.now() - cached.t < QUOTE_TTL) return cached.v;

  const res = await fetchJson<FmpQuote[]>(`${BASE}/quote?symbol=${ticker}&apikey=${key}`);
  let quote: Quote | null = null;
  if (res.ok && Array.isArray(res.data) && res.data[0]?.symbol) {
    const q = res.data[0];
    quote = {
      ticker: q.symbol,
      price: q.price,
      changePct: q.changePercentage,
      change: q.change,
      previousClose: q.previousClose,
    };
  }
  quoteCache.set(ticker, { t: Date.now(), v: quote });
  return quote;
}

export async function getQuotes(tickers: string[]): Promise<Record<string, Quote | null>> {
  const out: Record<string, Quote | null> = {};
  // 순차 호출(배치 미지원) — 캐시로 반복 호출 비용 최소화
  for (const t of tickers) {
    out[t] = await getQuote(t);
  }
  return out;
}

// ── 과거 종가 (EOD) ───────────────────────────────────────────

interface FmpEod {
  symbol: string;
  date: string; // YYYY-MM-DD
  price: number; // 종가
  volume: number;
}

const EOD_TTL = 60 * 60 * 1000; // 1시간
const eodCache = new Map<string, { t: number; rows: { date: string; close: number }[] }>();

/** [from, to] 구간의 일별 종가 (오름차순). 캐시됨. */
export async function getEodSeries(
  ticker: string,
  from: string,
  to: string,
): Promise<{ date: string; close: number }[]> {
  if (!isPriceSupported(ticker)) return [];
  const key = process.env.FMP_API_KEY;
  if (!key) return [];

  const cacheKey = `${ticker}:${from}:${to}`;
  const cached = eodCache.get(cacheKey);
  if (cached && Date.now() - cached.t < EOD_TTL) return cached.rows;

  const res = await fetchJson<FmpEod[]>(
    `${BASE}/historical-price-eod/light?symbol=${ticker}&from=${from}&to=${to}&apikey=${key}`,
  );
  let rows: { date: string; close: number }[] = [];
  if (res.ok && Array.isArray(res.data)) {
    rows = res.data
      .map((r) => ({ date: r.date, close: r.price }))
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
