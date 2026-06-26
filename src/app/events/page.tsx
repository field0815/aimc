import { Suspense } from "react";
import { Filters } from "@/components/Filters";
import { EventCard } from "@/components/EventCard";
import { RefreshButton } from "@/components/RefreshButton";
import { getEvents } from "@/lib/data/repository";
import { getI18n } from "@/lib/i18n";
import type { EventCategory, EventFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function parseFilter(sp: SearchParams): EventFilter {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const range = (get("range") ?? "week") as EventFilter["range"];
  const cats = (get("cat") ?? "").split(",").filter(Boolean) as EventCategory[];
  return {
    range,
    minImportance: Number(get("imp") ?? "1"),
    categories: cats.length ? cats : undefined,
    ticker: get("ticker") || undefined,
    semiOnly: get("semi") === "1",
  };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { locale, t } = getI18n();
  const filter = parseFilter(searchParams);
  const events = await getEvents(filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">{t.events.title}</h1>
        <RefreshButton t={t} />
      </div>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-bg-card" />}>
        <Filters t={t} locale={locale} />
      </Suspense>

      <p className="text-sm text-gray-400">
        {t.common.total} <span className="font-semibold text-white">{events.length}</span>
        {t.common.count}
      </p>

      {events.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg-card p-10 text-center text-gray-400">
          {t.events.none}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((e) => (
            <EventCard key={e.id} event={e} t={t} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
