import Link from "next/link";
import type { MarketEvent } from "@/lib/types";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { DIRECTION_COLOR, SEMI_TICKERS, stockName } from "@/lib/constants";
import { deriveDeclineType } from "@/lib/decline";
import { formatShortDate, dDayLabel } from "@/lib/utils/date";
import { CategoryBadge, CountryFlag, DeclineChip, ImportanceStars, StatusBadge } from "./Badges";

// 고위험(중요도 5 또는 FOMC) 이벤트는 붉은 테두리
function isHighRisk(e: MarketEvent): boolean {
  return e.importance >= 5 || e.category === "fomc";
}

// AI/반도체 관련 이벤트 표시
function isSemiRelated(e: MarketEvent): boolean {
  return (
    e.category === "semi_event" ||
    e.impacts.some((im) => SEMI_TICKERS.includes(im.ticker) && im.impactScore >= 4)
  );
}

export function EventCard({
  event,
  t,
  locale,
}: {
  event: MarketEvent;
  t: Dictionary;
  locale: Locale;
}) {
  const high = isHighRisk(event);
  const semi = isSemiRelated(event);
  const declineType = deriveDeclineType(event);
  const topImpacts = [...event.impacts]
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 4);

  return (
    <Link
      href={`/events/${event.id}`}
      className={`card-hover block rounded-xl border bg-bg-card p-4 transition-colors ${
        high ? "border-danger/60" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="tabular-nums">{formatShortDate(event.eventDate, locale)}</span>
            {event.eventTime && <span>· {event.eventTime}</span>}
            <CountryFlag country={event.country} />
          </div>
          <h3 className="truncate text-sm font-semibold text-white sm:text-base">
            {event.title}
          </h3>
        </div>
        <span className="shrink-0 rounded-md bg-bg-soft px-2 py-1 text-xs font-bold tabular-nums text-gray-300">
          {dDayLabel(event.eventDate)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryBadge category={event.category} label={t.categories[event.category]} />
        <DeclineChip type={declineType} label={t.decline.types[declineType].label} />
        <StatusBadge status={event.status} label={t.statuses[event.status]} />
        {semi && (
          <span className="rounded-full border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300">
            {t.badge.aiSemi}
          </span>
        )}
        <span className="ml-auto">
          <ImportanceStars value={event.importance} label={t.common.importance} />
        </span>
      </div>

      {(event.expectedValue || event.actualValue) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          {event.previousValue && (
            <span>
              {t.detail.previous} <span className="text-gray-200">{event.previousValue}</span>
            </span>
          )}
          {event.expectedValue && (
            <span>
              {t.detail.expected} <span className="text-gray-200">{event.expectedValue}</span>
            </span>
          )}
          {event.actualValue && (
            <span>
              {t.detail.actual}{" "}
              <span className="font-semibold text-emerald-300">{event.actualValue}</span>
            </span>
          )}
        </div>
      )}

      {topImpacts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topImpacts.map((im) => (
            <span
              key={im.id}
              className="rounded-md bg-bg-soft px-1.5 py-0.5 text-xs text-gray-300"
            >
              {stockName(im.ticker, locale, im.companyName)}
              <span className={`ml-1 font-semibold ${DIRECTION_COLOR[im.direction]}`}>
                {im.impactScore}
              </span>
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
