import { CATEGORY_BADGE, COUNTRY_FLAG, STATUS_BADGE } from "@/lib/constants";
import { DECLINE_META, type DeclineType } from "@/lib/decline";
import type { EventCategory, EventStatus } from "@/lib/types";

export function ImportanceStars({ value, label }: { value: number; label?: string }) {
  const full = Math.max(0, Math.min(5, value));
  return (
    <span
      className="inline-flex items-center text-amber-400"
      title={label ? `${label} ${full}/5` : `${full}/5`}
      aria-label={label ? `${label} ${full}/5` : `${full}/5`}
    >
      {"★".repeat(full)}
      <span className="text-gray-600">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function CategoryBadge({
  category,
  label,
}: {
  category: EventCategory;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[category]}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: EventStatus; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {label}
    </span>
  );
}

/** 하락 유형 칩 (좌측 색 점 + 라벨) */
export function DeclineChip({ type, label }: { type: DeclineType; label: string }) {
  const meta = DECLINE_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {label}
    </span>
  );
}

export function CountryFlag({ country }: { country: string }) {
  return (
    <span title={country}>
      {COUNTRY_FLAG[country] ?? "🌐"} <span className="text-xs text-gray-400">{country}</span>
    </span>
  );
}

/** 0~5 영향도 막대 */
export function ImpactBar({ score }: { score: number }) {
  const s = Math.max(0, Math.min(5, score));
  const color =
    s >= 4 ? "bg-red-500" : s === 3 ? "bg-amber-500" : s >= 1 ? "bg-emerald-500" : "bg-gray-700";
  return (
    <span className="inline-flex items-center gap-1" title={`${s}/5`}>
      <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
        <span className={`${color}`} style={{ width: `${(s / 5) * 100}%` }} />
      </span>
      <span className="w-3 text-right text-xs tabular-nums text-gray-400">{s}</span>
    </span>
  );
}
