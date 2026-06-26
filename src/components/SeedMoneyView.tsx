"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

// ─────────────────────────────────────────────────────────────
// 시드머니: ① 오늘 손익(실시세)  ② 투자시점 시뮬레이션(이벤트별 손익)
// 입력값은 localStorage 에 저장. 시세/시뮬은 서버 API 로 조회.
// ─────────────────────────────────────────────────────────────

const SEED_KEY = "aimc_seed_amounts";

interface Company {
  ticker: string;
  label: string;
  supported: boolean;
}

type QuoteMap = Record<
  string,
  { supported: boolean; price?: number; changePct?: number; change?: number }
>;

interface SimPoint {
  eventId: string;
  title: string;
  date: string;
  close: number | null;
  pnlPct: number | null;
  pending: boolean;
}

function pnlColor(v: number | null | undefined): string {
  if (v == null) return "text-gray-400";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-red-400";
  return "text-gray-300";
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtMoney(v: number, locale: Locale, won: string): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  const abs = Math.abs(Math.round(v)).toLocaleString(locale === "en" ? "en-US" : "ko-KR");
  return `${sign}${abs}${won}`;
}

export function SeedMoneyView({
  companies,
  t,
  locale,
}: {
  companies: Company[];
  t: Dictionary;
  locale: Locale;
}) {
  const won = t.seed.won;
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [loaded, setLoaded] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);

  // 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEED_KEY);
      if (raw) setAmounts(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // 저장
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SEED_KEY, JSON.stringify(amounts));
    } catch {
      /* ignore */
    }
  }, [amounts, loaded]);

  const supportedTickers = useMemo(
    () => companies.filter((c) => c.supported).map((c) => c.ticker),
    [companies],
  );

  const loadQuotes = useCallback(async () => {
    if (supportedTickers.length === 0) return;
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/quote?tickers=${supportedTickers.join(",")}`);
      const json = await res.json();
      setQuotes(json.quotes ?? {});
      setAsOf(json.asOf ?? null);
    } catch {
      /* ignore */
    } finally {
      setQuoteLoading(false);
    }
  }, [supportedTickers]);

  useEffect(() => {
    if (loaded) loadQuotes();
  }, [loaded, loadQuotes]);

  const amountOf = (ticker: string) => Number(amounts[ticker] || 0);

  const totalToday = useMemo(() => {
    let sum = 0;
    for (const c of companies) {
      const q = quotes[c.ticker];
      const amt = amountOf(c.ticker);
      if (c.supported && q?.changePct != null && amt > 0) {
        sum += (amt * q.changePct) / 100;
      }
    }
    return sum;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, quotes, amounts]);

  const hasAnyAmount = companies.some((c) => amountOf(c.ticker) > 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-300">{t.seed.intro}</p>

      {/* ① 오늘 손익 */}
      <section className="space-y-3 rounded-xl border border-line bg-bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{t.nav.seed} · {t.seed.todayPnl}</h2>
          <button
            onClick={loadQuotes}
            disabled={quoteLoading}
            className="rounded-lg border border-line bg-bg-soft px-2.5 py-1 text-xs text-gray-300 hover:text-white disabled:opacity-50"
          >
            <span className={quoteLoading ? "animate-spin inline-block" : ""}>↻</span> {t.seed.refresh}
          </button>
        </div>

        <div className="scroll-x">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-gray-400">
                <th className="py-2 pr-2 font-medium">{t.detail.th.stock}</th>
                <th className="py-2 pr-2 font-medium">{t.seed.amount}</th>
                <th className="py-2 pr-2 font-medium">{t.seed.todayChange}</th>
                <th className="py-2 font-medium text-right">{t.seed.todayPnl}</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const q = quotes[c.ticker];
                const amt = amountOf(c.ticker);
                const pnl = c.supported && q?.changePct != null ? (amt * q.changePct) / 100 : null;
                return (
                  <tr key={c.ticker} className="border-b border-line/50">
                    <td className="py-2 pr-2">
                      <span className="font-medium text-white">{c.label}</span>
                      <span className="ml-1 text-xs text-gray-500">{c.ticker}</span>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        inputMode="numeric"
                        value={amounts[c.ticker] ?? ""}
                        onChange={(e) =>
                          setAmounts((p) => ({ ...p, [c.ticker]: e.target.value.replace(/[^0-9]/g, "") }))
                        }
                        placeholder="0"
                        className="w-24 rounded-md border border-line bg-bg-soft px-2 py-1 text-right text-sm text-gray-100"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      {!c.supported ? (
                        <span className="text-xs text-gray-500">{t.seed.unsupported}</span>
                      ) : q?.changePct != null ? (
                        <span className={pnlColor(q.changePct)}>{fmtPct(q.changePct)}</span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className={`py-2 text-right font-semibold ${pnlColor(pnl)}`}>
                      {pnl != null && amt > 0 ? fmtMoney(pnl, locale, won) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {hasAnyAmount && (
              <tfoot>
                <tr className="border-t border-line">
                  <td colSpan={3} className="py-2 pr-2 text-xs text-gray-400">
                    {t.seed.totalToday}
                  </td>
                  <td className={`py-2 text-right text-base font-bold ${pnlColor(totalToday)}`}>
                    {fmtMoney(totalToday, locale, won)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="text-xs text-gray-500">
          {hasAnyAmount ? "" : t.seed.noSeed} {asOf && `· ${t.seed.asOf} ${new Date(asOf).toLocaleTimeString(locale === "en" ? "en-US" : "ko-KR")}`} · {t.seed.savedHint}
        </p>
      </section>

      {/* ② 투자시점 시뮬레이션 */}
      <SimSection companies={companies.filter((c) => c.supported)} t={t} locale={locale} />
    </div>
  );
}

function SimSection({
  companies,
  t,
  locale,
}: {
  companies: Company[];
  t: Dictionary;
  locale: Locale;
}) {
  const won = t.seed.won;
  const [ticker, setTicker] = useState(companies[0]?.ticker ?? "");
  const [amount, setAmount] = useState("10000000");
  const [entry, setEntry] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | { entryClose: number | null; nowPnlPct: number | null; points: SimPoint[]; supported: boolean }
    | null
  >(null);
  const [touched, setTouched] = useState(false);

  const amt = Number(amount || 0);

  async function run() {
    if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(entry)) return;
    setLoading(true);
    setTouched(true);
    try {
      const res = await fetch(`/api/seed-sim?ticker=${ticker}&entry=${entry}`);
      setResult(await res.json());
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-line bg-bg-card p-4">
      <h2 className="text-base font-semibold text-white">{t.seed.simTitle}</h2>
      <p className="text-sm text-gray-400">{t.seed.simIntro}</p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-gray-400">
          {t.seed.simTicker}
          <select
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="mt-1 block rounded-md border border-line bg-bg-soft px-2 py-1.5 text-sm text-gray-100"
          >
            {companies.map((c) => (
              <option key={c.ticker} value={c.ticker}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-400">
          {t.seed.simAmount}
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            className="mt-1 block w-32 rounded-md border border-line bg-bg-soft px-2 py-1.5 text-right text-sm text-gray-100"
          />
        </label>
        <label className="text-xs text-gray-400">
          {t.seed.simEntry}
          <input
            type="date"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="mt-1 block rounded-md border border-line bg-bg-soft px-2 py-1.5 text-sm text-gray-100"
          />
        </label>
        <button
          onClick={run}
          disabled={loading || !ticker || !entry}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t.seed.simLoading : t.seed.simRun}
        </button>
      </div>

      {!touched ? (
        <p className="rounded-lg border border-line bg-bg-soft p-4 text-center text-sm text-gray-500">
          {t.seed.simPick}
        </p>
      ) : loading ? (
        <p className="p-4 text-center text-sm text-gray-500">{t.seed.simLoading}</p>
      ) : !result || result.supported === false || result.entryClose == null ? (
        <p className="rounded-lg border border-line bg-bg-soft p-4 text-center text-sm text-gray-500">
          {t.seed.simNoData}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 rounded-lg bg-bg-soft p-3 text-sm">
            <span className="text-gray-400">
              {t.seed.simEntryClose}:{" "}
              <span className="font-medium text-gray-100">{result.entryClose?.toFixed(2)}</span>
            </span>
            <span className="text-gray-400">
              {t.seed.todayPnl}:{" "}
              <span className={`font-semibold ${pnlColor(result.nowPnlPct)}`}>
                {fmtPct(result.nowPnlPct)}{" "}
                {result.nowPnlPct != null && amt > 0 && `(${fmtMoney((amt * result.nowPnlPct) / 100, locale, won)})`}
              </span>
            </span>
          </div>

          {result.points.length === 0 ? (
            <p className="text-sm text-gray-500">{t.seed.simNoData}</p>
          ) : (
            <div className="scroll-x">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-gray-400">
                    <th className="py-2 pr-2 font-medium">{t.seed.simEventCol}</th>
                    <th className="py-2 pr-2 font-medium">{t.seed.simCloseCol}</th>
                    <th className="py-2 font-medium text-right">{t.seed.simPnlCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.points.map((p) => (
                    <tr key={p.eventId} className="border-b border-line/50">
                      <td className="py-2 pr-2">
                        <Link href={`/events/${p.eventId}`} className="hover:underline">
                          <span className="text-xs tabular-nums text-gray-500">{p.date}</span>{" "}
                          <span className="text-gray-100">{p.title}</span>
                        </Link>
                      </td>
                      <td className="py-2 pr-2 tabular-nums text-gray-300">
                        {p.pending ? <span className="text-xs text-gray-600">예정</span> : p.close?.toFixed(2) ?? "—"}
                      </td>
                      <td className={`py-2 text-right font-semibold ${pnlColor(p.pnlPct)}`}>
                        {p.pnlPct != null ? (
                          <>
                            {fmtPct(p.pnlPct)}
                            {amt > 0 && (
                              <span className="ml-1 text-xs font-normal">
                                ({fmtMoney((amt * p.pnlPct) / 100, locale, won)})
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
