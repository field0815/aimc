import Link from "next/link";
import { getDashboard } from "@/lib/data/repository";
import { EventCard } from "@/components/EventCard";
import { RefreshButton } from "@/components/RefreshButton";
import { CategoryBadge, DeclineChip, ImportanceStars } from "@/components/Badges";
import { deriveDeclineType } from "@/lib/decline";
import { formatLongDate, dDayLabel, formatShortDate } from "@/lib/utils/date";
import { getI18n } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { MarketEvent } from "@/lib/types";

/** 해설 첫 문장만 간략히 */
function firstSentence(text?: string | null): string | null {
  if (!text) return null;
  const m = text.match(/^.*?[.!?。](\s|$)/);
  const s = (m ? m[0] : text).trim();
  return s.length > 80 ? s.slice(0, 79) + "…" : s;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { locale, t } = getI18n();
  const dash = await getDashboard();

  return (
    <div className="space-y-7">
      {/* 상단: 오늘 + 새로고침 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">{t.dashboard.today}</p>
          <h1 className="text-xl font-bold text-white">{formatLongDate(dash.today, locale)}</h1>
        </div>
        <RefreshButton t={t} />
      </div>

      {/* 오늘 핵심 (한눈에 이해) */}
      <TodayBrief
        event={dash.brief}
        isToday={dash.briefIsToday}
        t={t}
        locale={locale}
      />

      {/* 상단 지표 카드들 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RiskCard score={dash.weekRiskScore} t={t} />
        <DdayCard label={t.dashboard.nextFomc} event={dash.nextFomc} locale={locale} none={t.dashboard.none} />
        <DdayCard label={t.dashboard.nextInflation} event={dash.nextInflation} locale={locale} none={t.dashboard.none} />
        <DdayCard label={t.dashboard.nextSemiEarnings} event={dash.nextSemiEarnings} locale={locale} none={t.dashboard.none} />
      </section>

      {/* 빠른 이동 */}
      <section className="flex flex-wrap gap-2">
        <QuickLink href="/events?range=week&semi=1" label={t.dashboard.quick.aiSemi} />
        <QuickLink href="/events?range=month" label={t.dashboard.quick.thisMonth} />
        <QuickLink href="/events?range=all&imp=5" label={t.dashboard.quick.top5} />
        <QuickLink href="/history" label={t.history.quick} />
        <QuickLink href="/events?range=all&ticker=000660.KS" label={t.dashboard.quick.skhynix} />
        <QuickLink href="/events?range=all&ticker=NVDA" label={t.dashboard.quick.nvidia} />
      </section>

      <Block
        title={t.dashboard.todayEvents.title}
        more={{ href: "/events?range=today", label: t.dashboard.todayEvents.more }}
        empty={t.dashboard.todayEvents.empty}
        events={dash.todayEvents}
        t={t}
        locale={locale}
      />
      <Block
        title={t.dashboard.topRisky.title}
        more={{ href: "/events?range=week", label: t.dashboard.topRisky.more }}
        empty={t.dashboard.topRisky.empty}
        events={dash.topRiskyThisWeek}
        t={t}
        locale={locale}
      />
      <Block
        title={t.dashboard.released.title}
        more={{ href: "/events?range=all", label: t.dashboard.released.more }}
        empty={t.dashboard.released.empty}
        events={dash.releasedWithActual}
        t={t}
        locale={locale}
      />
    </div>
  );
}

function TodayBrief({
  event,
  isToday,
  t,
  locale,
}: {
  event: MarketEvent | null;
  isToday: boolean;
  t: Dictionary;
  locale: Locale;
}) {
  if (!event) {
    return (
      <section className="rounded-2xl border border-line bg-bg-card p-5 text-sm text-gray-300">
        🌤️ {t.dashboard.briefRelax}
      </section>
    );
  }

  const high = event.importance >= 5 || event.category === "fomc";
  const why = firstSentence(event.summary);
  const declineType = deriveDeclineType(event);

  return (
    <Link
      href={`/events/${event.id}`}
      className={`group block rounded-2xl border p-5 transition-colors ${
        high
          ? "border-danger/50 bg-gradient-to-br from-danger/10 to-bg-card"
          : "border-accent/40 bg-gradient-to-br from-accent/10 to-bg-card"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {isToday ? `🎯 ${t.dashboard.briefToday}` : `⏭️ ${t.dashboard.briefNext}`}
        </span>
        <span className="ml-auto rounded-md bg-black/30 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
          {dDayLabel(event.eventDate)}
        </span>
      </div>

      <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">{event.title}</h2>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span>{formatShortDate(event.eventDate, locale)}</span>
        {event.eventTime && <span>· {event.eventTime}</span>}
        <CategoryBadge category={event.category} label={t.categories[event.category]} />
        <DeclineChip type={declineType} label={t.decline.types[declineType].label} />
        <ImportanceStars value={event.importance} label={t.common.importance} />
      </div>

      {why && <p className="mt-3 text-sm leading-relaxed text-gray-300">{why}</p>}

      <span className="mt-3 inline-block text-xs font-medium text-accent group-hover:underline">
        {t.dashboard.briefSee} →
      </span>
    </Link>
  );
}

function RiskCard({ score, t }: { score: number; t: Dictionary }) {
  const r = t.dashboard.riskLevel;
  const level = score >= 80 ? r.veryHigh : score >= 60 ? r.high : score >= 40 ? r.medium : r.low;
  const color =
    score >= 80
      ? "text-red-400"
      : score >= 60
        ? "text-amber-400"
        : score >= 40
          ? "text-yellow-300"
          : "text-emerald-400";
  return (
    <div className="rounded-xl border border-line bg-bg-card p-4">
      <p className="text-xs text-gray-500">{t.dashboard.weekRisk}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{score}</p>
      <p className="mt-0.5 text-xs text-gray-400">{level}</p>
    </div>
  );
}

function DdayCard({
  label,
  event,
  locale,
  none,
}: {
  label: string;
  event: MarketEvent | null;
  locale: Locale;
  none: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-card p-4">
      <p className="text-xs text-gray-500">{label}</p>
      {event ? (
        <Link href={`/events/${event.id}`} className="group block">
          <p className="mt-1 text-2xl font-bold text-white group-hover:text-accent">
            {dDayLabel(event.eventDate)}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-400">
            {formatShortDate(event.eventDate, locale)} · {event.title}
          </p>
        </Link>
      ) : (
        <p className="mt-1 text-sm text-gray-600">{none}</p>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-line bg-bg-card px-3 py-1.5 text-sm text-gray-300 hover:border-accent hover:text-white"
    >
      {label}
    </Link>
  );
}

function Block({
  title,
  more,
  empty,
  events,
  t,
  locale,
}: {
  title: string;
  more: { href: string; label: string };
  empty: string;
  events: MarketEvent[];
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <Link href={more.href} className="text-xs text-accent hover:underline">
          {more.label} →
        </Link>
      </div>
      {events.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg-card p-6 text-center text-sm text-gray-500">
          {empty}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((e) => (
            <EventCard key={e.id} event={e} t={t} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}
