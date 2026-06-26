"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MarketEvent } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { toISODate, todayISO } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────
// 월간 캘린더 (이벤트를 날짜 그리드에 표시).
// 이전/다음 달 이동은 클라이언트에서 처리.
// ─────────────────────────────────────────────────────────────

function importanceDot(importance: number, category: string): string {
  if (importance >= 5 || category === "fomc") return "bg-red-400";
  if (importance === 4) return "bg-amber-400";
  if (category === "earnings") return "bg-blue-400";
  return "bg-slate-400";
}

export function CalendarView({
  events,
  t,
  locale,
}: {
  events: MarketEvent[];
  t: Dictionary;
  locale: Locale;
}) {
  const today = todayISO();
  const init = new Date(today + "T00:00:00");
  const [year, setYear] = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth()); // 0-11

  const byDate = useMemo(() => {
    const m = new Map<string, MarketEvent[]>();
    for (const e of events) {
      const arr = m.get(e.eventDate) ?? [];
      arr.push(e);
      m.set(e.eventDate, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => b.importance - a.importance);
    return m;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    const out: { iso: string | null; day: number | null }[] = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - startWeekday + 1;
      if (dayNum < 1 || dayNum > daysInMonth) out.push({ iso: null, day: null });
      else out.push({ iso: toISODate(new Date(year, month, dayNum)), day: dayNum });
    }
    return out;
  }, [year, month]);

  const monthLabel =
    locale === "en"
      ? new Date(year, month, 1).toLocaleString("en-US", { month: "long", year: "numeric" })
      : `${year}년 ${month + 1}월`;

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const goToday = () => {
    setYear(init.getFullYear());
    setMonth(init.getMonth());
  };

  const monthHasEvents = cells.some((c) => c.iso && byDate.has(c.iso));

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} className="rounded-md bg-bg-card px-2.5 py-1.5 text-sm text-gray-300 hover:text-white" aria-label={t.calendar.prev}>
            ‹
          </button>
          <button onClick={goToday} className="rounded-md bg-bg-card px-3 py-1.5 text-xs text-gray-300 hover:text-white">
            {t.calendar.today}
          </button>
          <button onClick={() => go(1)} className="rounded-md bg-bg-card px-2.5 py-1.5 text-sm text-gray-300 hover:text-white" aria-label={t.calendar.next}>
            ›
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {t.calendar.weekdays.map((w, i) => (
          <div key={w} className={i === 0 ? "text-red-400/70" : i === 6 ? "text-blue-400/70" : ""}>
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (!c.iso)
            return <div key={idx} className="min-h-[64px] rounded-lg bg-bg-soft/30 sm:min-h-[92px]" />;
          const dayEvents = byDate.get(c.iso) ?? [];
          const isToday = c.iso === today;
          return (
            <div
              key={idx}
              className={`min-h-[64px] rounded-lg border p-1 sm:min-h-[92px] ${
                isToday ? "border-accent bg-accent/10" : "border-line bg-bg-card"
              }`}
            >
              <div className={`mb-0.5 text-right text-[11px] ${isToday ? "font-bold text-accent" : "text-gray-500"}`}>
                {c.day}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="flex items-center gap-1 truncate rounded bg-bg-soft px-1 py-0.5 text-[10px] leading-tight text-gray-200 hover:bg-bg-soft/70"
                    title={e.title}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${importanceDot(e.importance, e.category)}`} />
                    <span className="truncate">{e.title}</span>
                  </Link>
                ))}
                {dayEvents.length > 2 && (
                  <Link
                    href={`/events?range=all`}
                    className="block px-1 text-[10px] text-gray-500 hover:text-gray-300"
                  >
                    {t.calendar.more.replace("{n}", String(dayEvents.length - 2))}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!monthHasEvents && (
        <p className="rounded-lg border border-line bg-bg-card p-4 text-center text-sm text-gray-500">
          {t.calendar.empty}
        </p>
      )}
    </div>
  );
}
