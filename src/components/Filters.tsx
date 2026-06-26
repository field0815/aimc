"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CATEGORY_ORDER, IMPACT_COLUMNS, stockName } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

// ─────────────────────────────────────────────────────────────
// 이벤트 목록 필터 (URL 쿼리스트링 기반, 새로고침/공유 가능)
// ─────────────────────────────────────────────────────────────

export function Filters({ t, locale }: { t: Dictionary; locale: Locale }) {
  const router = useRouter();
  const params = useSearchParams();

  const range = params.get("range") ?? "week";
  const minImportance = Number(params.get("imp") ?? "1");
  const activeCats = new Set((params.get("cat") ?? "").split(",").filter(Boolean));
  const ticker = params.get("ticker") ?? "";
  const semiOnly = params.get("semi") === "1";

  const update = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      router.push(`/events?${sp.toString()}`);
    },
    [params, router],
  );

  const toggleCat = (value: string) => {
    const next = new Set(activeCats);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update({ cat: [...next].join(",") || null });
  };

  const ranges = [
    { value: "today", label: t.events.range.today },
    { value: "week", label: t.events.range.week },
    { value: "month", label: t.events.range.month },
    { value: "all", label: t.events.range.all },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-line bg-bg-card p-4">
      {/* 기간 */}
      <div className="flex flex-wrap gap-1.5">
        {ranges.map((r) => (
          <button
            key={r.value}
            onClick={() => update({ range: r.value })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              range === r.value
                ? "bg-accent text-white"
                : "bg-bg-soft text-gray-300 hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 중요도 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{t.events.minImportance}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => update({ imp: n === 1 ? null : String(n) })}
              className={`h-7 w-7 rounded-md text-sm ${
                minImportance >= n && minImportance > 1
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-bg-soft text-gray-500"
              }`}
              title={`★${n} ${t.events.importanceTooltip}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCat(cat)}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              activeCats.has(cat)
                ? "border-accent bg-accent/20 text-white"
                : "border-line bg-bg-soft text-gray-400 hover:text-white"
            }`}
          >
            {t.categories[cat]}
          </button>
        ))}
      </div>

      {/* 종목 / AI반도체 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={ticker}
          onChange={(e) => update({ ticker: e.target.value || null })}
          className="rounded-lg border border-line bg-bg-soft px-2 py-1.5 text-sm text-gray-200"
        >
          <option value="">{t.events.allTickers}</option>
          {IMPACT_COLUMNS.map((c) => (
            <option key={c.ticker} value={c.ticker}>
              {stockName(c.ticker, locale)}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={semiOnly}
            onChange={(e) => update({ semi: e.target.checked ? "1" : null })}
            className="accent-green-500"
          />
          {t.events.aiSemiOnly}
        </label>

        <button
          onClick={() => router.push("/events")}
          className="ml-auto text-xs text-gray-500 hover:text-gray-300"
        >
          {t.common.reset}
        </button>
      </div>
    </div>
  );
}
