import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/data/repository";
import {
  CategoryBadge,
  CountryFlag,
  DeclineChip,
  ImpactBar,
  ImportanceStars,
  StatusBadge,
} from "@/components/Badges";
import { DIRECTION_COLOR, stockName } from "@/lib/constants";
import { deriveDeclineType, DECLINE_META } from "@/lib/decline";
import { formatLongDate, dDayLabel } from "@/lib/utils/date";
import { getI18n } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { locale, t } = getI18n();
  const event = await getEventById(params.id);
  if (!event) notFound();

  const high = event.importance >= 5 || event.category === "fomc";
  const impacts = [...event.impacts].sort((a, b) => b.impactScore - a.impactScore);
  const declineType = deriveDeclineType(event);
  const declineMeta = DECLINE_META[declineType];
  const declineCopy = t.decline.types[declineType];

  return (
    <article className="space-y-6">
      <Link href="/events" className="text-sm text-gray-400 hover:text-white">
        {t.detail.back}
      </Link>

      {/* 헤더 */}
      <header
        className={`rounded-xl border bg-bg-card p-5 ${high ? "border-danger/60" : "border-line"}`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
          <span>{formatLongDate(event.eventDate, locale)}</span>
          {event.eventTime && <span>· {event.eventTime}</span>}
          <CountryFlag country={event.country} />
          <span className="rounded-md bg-bg-soft px-2 py-0.5 text-xs font-bold text-gray-200">
            {dDayLabel(event.eventDate)}
          </span>
        </div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">{event.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CategoryBadge category={event.category} label={t.categories[event.category]} />
          <StatusBadge status={event.status} label={t.statuses[event.status]} />
          <ImportanceStars value={event.importance} label={t.common.importance} />
          {event.sourceUrl ? (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-xs text-accent hover:underline"
            >
              {t.common.source}({event.source}) ↗
            </a>
          ) : (
            <span className="ml-auto text-xs text-gray-500">
              {t.common.source}: {event.source}
            </span>
          )}
        </div>
      </header>

      {/* 발표값 */}
      <section className="grid grid-cols-3 gap-3">
        <ValueBox label={t.detail.previous} value={event.previousValue} />
        <ValueBox label={t.detail.expected} value={event.expectedValue} />
        <ValueBox label={t.detail.actual} value={event.actualValue} highlight />
      </section>

      {/* 해설/시나리오 */}
      {event.summary && (
        <Section title={t.detail.summary}>
          <p className="text-sm leading-relaxed text-gray-300">{event.summary}</p>
        </Section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {event.bullCase && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <h3 className="mb-1.5 text-sm font-semibold text-emerald-300">{t.detail.bullCase}</h3>
            <p className="text-sm leading-relaxed text-gray-300">{event.bullCase}</p>
          </div>
        )}
        {event.bearCase && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <h3 className="mb-1.5 text-sm font-semibold text-red-300">{t.detail.bearCase}</h3>
            <p className="text-sm leading-relaxed text-gray-300">{event.bearCase}</p>
          </div>
        )}
      </div>

      {event.tradingNote && (
        <Section title={t.detail.tradingNote}>
          <p className="text-sm leading-relaxed text-amber-200/90">{event.tradingNote}</p>
        </Section>
      )}

      {/* 하락 유형 (이번 하락은 어떤 하락인가) */}
      <section className="rounded-xl border border-line bg-bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold text-white">{t.decline.panelTitle}</h2>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <DeclineChip type={declineType} label={declineCopy.label} />
          <span className="text-xs text-gray-400">
            {t.decline.severityLabel[String(declineMeta.severity) as "1" | "2" | "3"]}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-gray-300">{declineCopy.desc}</p>
        <p className="mt-2 text-xs text-gray-500">{t.decline.panelNote}</p>
        <Link
          href="/guide"
          className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
        >
          {t.decline.guideLink} →
        </Link>
      </section>

      {/* 종목 영향도 */}
      <Section title={t.detail.impactTitle}>
        {impacts.length === 0 ? (
          <p className="text-sm text-gray-500">{t.detail.noImpacts}</p>
        ) : (
          <div className="scroll-x">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-gray-400">
                  <th className="py-2 pr-3 font-medium">{t.detail.th.stock}</th>
                  <th className="py-2 pr-3 font-medium">{t.detail.th.impact}</th>
                  <th className="py-2 pr-3 font-medium">{t.detail.th.direction}</th>
                  <th className="py-2 font-medium">{t.detail.th.note}</th>
                </tr>
              </thead>
              <tbody>
                {impacts.map((im) => (
                  <tr key={im.id} className="border-b border-line/50">
                    <td className="py-2 pr-3">
                      <span className="font-medium text-white">
                        {stockName(im.ticker, locale, im.companyName)}
                      </span>
                      <span className="ml-1 text-xs text-gray-500">{im.ticker}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <ImpactBar score={im.impactScore} />
                    </td>
                    <td className={`py-2 pr-3 font-medium ${DIRECTION_COLOR[im.direction]}`}>
                      {t.directions[im.direction]}
                    </td>
                    <td className="py-2 text-xs text-gray-400">{im.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="text-xs text-gray-600">{t.detail.disclaimer}</p>
    </article>
  );
}

function ValueBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-card p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`mt-1 text-sm font-semibold ${
          highlight && value ? "text-emerald-300" : "text-gray-200"
        }`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
