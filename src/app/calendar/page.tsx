import { getEvents } from "@/lib/data/repository";
import { getI18n } from "@/lib/i18n";
import { CalendarView } from "@/components/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { locale, t } = getI18n();
  const events = await getEvents({ range: "all" });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">{t.calendar.title}</h1>
      <CalendarView events={events} t={t} locale={locale} />
    </div>
  );
}
