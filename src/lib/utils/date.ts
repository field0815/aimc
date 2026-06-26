// ─────────────────────────────────────────────────────────────
// 날짜 유틸 — 모든 비교는 "YYYY-MM-DD" 문자열 기준 (타임존 이슈 회피)
// ─────────────────────────────────────────────────────────────

/** Date -> "YYYY-MM-DD" (로컬 기준) */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** 오늘 기준 n일 더한 날짜 문자열 */
export function addDaysISO(days: number, base = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** 이번 주(월~일) 범위 [start, end] */
export function thisWeekRange(base = new Date()): [string, string] {
  const d = new Date(base);
  const day = d.getDay(); // 0(일)~6(토)
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [toISODate(monday), toISODate(sunday)];
}

/** 이번 달 범위 [start, end] */
export function thisMonthRange(base = new Date()): [string, string] {
  const d = new Date(base);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [toISODate(start), toISODate(end)];
}

/** 두 ISO 날짜의 일수 차이 (target - today). 미래면 양수. */
export function dDay(targetISO: string, base = new Date()): number {
  const t = new Date(targetISO + "T00:00:00");
  const b = new Date(toISODate(base) + "T00:00:00");
  return Math.round((t.getTime() - b.getTime()) / 86_400_000);
}

/** D-day 라벨: "D-3" / "D-DAY" / "D+2" */
export function dDayLabel(targetISO: string): string {
  const n = dDay(targetISO);
  if (n === 0) return "D-DAY";
  if (n > 0) return `D-${n}`;
  return `D+${Math.abs(n)}`;
}

const WEEKDAYS: Record<string, string[]> = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/** "2026-06-26" -> "6/26 (금)" / "Jun 26 (Fri)" */
export function formatShortDate(iso: string, locale: "ko" | "en" = "ko"): string {
  const d = new Date(iso + "T00:00:00");
  const week = (WEEKDAYS[locale] ?? WEEKDAYS.ko)[d.getDay()];
  if (locale === "en") {
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
      d.getMonth()
    ];
    return `${mon} ${d.getDate()} (${week})`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} (${week})`;
}

/** "2026-06-26" -> "2026년 6월 26일 (금)" / "Jun 26, 2026 (Fri)" */
export function formatLongDate(iso: string, locale: "ko" | "en" = "ko"): string {
  const d = new Date(iso + "T00:00:00");
  const week = (WEEKDAYS[locale] ?? WEEKDAYS.ko)[d.getDay()];
  if (locale === "en") {
    const mon = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][
      d.getMonth()
    ];
    return `${mon} ${d.getDate()}, ${d.getFullYear()} (${week})`;
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${week})`;
}

/** 날짜가 범위 [start,end] 안에 있는지 (문자열 비교) */
export function isWithin(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}
