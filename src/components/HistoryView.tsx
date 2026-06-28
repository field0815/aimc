"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { EventKey } from "@/lib/history";

// ─────────────────────────────────────────────────────────────
// 이벤트 히스토리 통계 뷰 (이벤트 유형 × 종목 → 과거 당일 반응 통계)
// ─────────────────────────────────────────────────────────────

const EVENTS: EventKey[] = ["cpi", "pce", "employment", "fomc"];

interface HistResp {
  supported: boolean;
  points: { date: string; pct: number | null }[];
  stats: {
    count: number;
    avg: number | null;
    median: number | null;
    upProb: number | null;
    avgUp: number | null;
    avgDown: number | null;
    best: number | null;
    worst: number | null;
  };
}

function color(v: number | null | undefined): string {
  if (v == null) return "text-gray-400";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-red-400";
  return "text-gray-300";
}
function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function HistoryView({
  companies,
  t,
  initialEvent,
  initialTicker,
}: {
  companies: { ticker: string; label: string }[];
  t: Dictionary;
  initialEvent?: EventKey;
  initialTicker?: string;
}) {
  const [event, setEvent] = useState<EventKey>(initialEvent ?? "cpi");
  const [ticker, setTicker] = useState(initialTicker ?? companies[0]?.ticker ?? "NVDA");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [res, setRes] = useState<HistResp | null>(null);

  async function run() {
    setLoading(true);
    setTouched(true);
    try {
      const r = await fetch(`/api/history?event=${event}&ticker=${ticker}&n=12`);
      setRes(await r.json());
    } catch {
      setRes(null);
    } finally {
      setLoading(false);
    }
  }

  const s = res?.stats;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-300">{t.history.intro}</p>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-bg-card p-4">
        <label className="text-xs text-gray-400">
          {t.history.event}
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value as EventKey)}
            className="mt-1 block rounded-md border border-line bg-bg-soft px-2 py-1.5 text-sm text-gray-100"
          >
            {EVENTS.map((e) => (
              <option key={e} value={e}>
                {t.history.events[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-400">
          {t.history.ticker}
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
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t.history.loading : t.history.run}
        </button>
      </div>

      {!touched ? (
        <Empty>{t.history.pick}</Empty>
      ) : loading ? (
        <Empty>{t.history.loading}</Empty>
      ) : !res || !s || s.count === 0 ? (
        <Empty>{t.history.noData}</Empty>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t.history.avg} value={pct(s.avg)} cls={color(s.avg)} />
            <Stat
              label={t.history.upProb}
              value={s.upProb != null ? `${Math.round(s.upProb)}%` : "—"}
              cls={s.upProb != null && s.upProb >= 50 ? "text-emerald-400" : "text-red-400"}
            />
            <Stat label={t.history.avgUp} value={pct(s.avgUp)} cls="text-emerald-400" />
            <Stat label={t.history.avgDown} value={pct(s.avgDown)} cls="text-red-400" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-400">
            <span>
              {t.history.samples}: <b className="text-gray-200">{s.count}{t.history.times}</b>
            </span>
            <span>
              {t.history.best}: <b className={color(s.best)}>{pct(s.best)}</b>
            </span>
            <span>
              {t.history.worst}: <b className={color(s.worst)}>{pct(s.worst)}</b>
            </span>
          </div>

          {/* 회차별 */}
          <div className="scroll-x rounded-xl border border-line bg-bg-card p-4">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-gray-400">
                  <th className="py-2 font-medium">{t.history.occDate}</th>
                  <th className="py-2 text-right font-medium">{t.history.occMove}</th>
                </tr>
              </thead>
              <tbody>
                {res.points.map((p) => (
                  <tr key={p.date} className="border-b border-line/50">
                    <td className="py-1.5 tabular-nums text-gray-300">{p.date}</td>
                    <td className={`py-1.5 text-right font-semibold ${color(p.pct)}`}>{pct(p.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-600">{t.history.disclaimer}</p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-card p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-bg-card p-6 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}
