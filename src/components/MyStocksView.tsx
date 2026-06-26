"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketEvent } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { MACRO_CATEGORIES } from "@/lib/constants";
import { EventCard } from "./EventCard";

// ─────────────────────────────────────────────────────────────
// 내 종목 개인화 뷰 (클라이언트, localStorage 기반 — 계정 불필요)
//
// 사용자가 보유/관심 종목을 고르면:
//   📌 내 종목 영향 이벤트  = 선택 종목에 영향(영향도 ≥ 3)을 주는 이벤트
//   🌐 거시 이벤트          = 금리·물가·수급 등 "모두에게 영향" → 항상 노출
// 선택은 localStorage 에 저장되어 다음 방문에도 유지된다.
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "aimc_my_tickers";
const MY_IMPACT_THRESHOLD = 3;

export function MyStocksView({
  events,
  companies,
  t,
  locale,
}: {
  events: MarketEvent[];
  companies: { ticker: string; label: string }[];
  t: Dictionary;
  locale: Locale;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // 최초 로드: localStorage 에서 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSelected(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
    } catch {
      /* ignore */
    }
  }, [selected, loaded]);

  const toggle = (ticker: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const { myEvents, macroEvents } = useMemo(() => {
    const my: MarketEvent[] = [];
    const myIds = new Set<string>();

    for (const e of events) {
      const hit = e.impacts.some(
        (im) => selected.has(im.ticker) && im.impactScore >= MY_IMPACT_THRESHOLD,
      );
      if (hit) {
        my.push(e);
        myIds.add(e.id);
      }
    }

    // 거시 이벤트: 항상 노출하되, 이미 내 종목 목록에 든 건 제외(중복 방지)
    const macro = events.filter(
      (e) => MACRO_CATEGORIES.includes(e.category) && !myIds.has(e.id),
    );

    const byDate = (a: MarketEvent, b: MarketEvent) =>
      a.eventDate < b.eventDate ? -1 : a.eventDate > b.eventDate ? 1 : 0;
    return { myEvents: my.sort(byDate), macroEvents: macro.sort(byDate) };
  }, [events, selected]);

  return (
    <div className="space-y-6">
      {/* 종목 선택 */}
      <section className="space-y-3 rounded-xl border border-line bg-bg-card p-4">
        <p className="text-sm text-gray-300">{t.my.intro}</p>
        <div className="flex flex-wrap gap-1.5">
          {companies.map((c) => {
            const on = selected.has(c.ticker);
            return (
              <button
                key={c.ticker}
                onClick={() => toggle(c.ticker)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on
                    ? "border-accent bg-accent/20 text-white"
                    : "border-line bg-bg-soft text-gray-400 hover:text-white"
                }`}
              >
                {on ? "✓ " : ""}
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {selected.size}
            {t.my.countSelected} · {t.my.savedHint}
          </span>
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="hover:text-gray-300">
              {t.my.clear}
            </button>
          )}
        </div>
      </section>

      {/* 내 종목 영향 이벤트 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">{t.my.myEvents}</h2>
        {selected.size === 0 ? (
          <Empty>{t.my.noSelection}</Empty>
        ) : myEvents.length === 0 ? (
          <Empty>{t.my.noMyEvents}</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myEvents.map((e) => (
              <EventCard key={e.id} event={e} t={t} locale={locale} />
            ))}
          </div>
        )}
      </section>

      {/* 거시 이벤트 (항상) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">{t.my.macroEvents}</h2>
        {macroEvents.length === 0 ? (
          <Empty>—</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {macroEvents.map((e) => (
              <EventCard key={e.id} event={e} t={t} locale={locale} />
            ))}
          </div>
        )}
      </section>
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
