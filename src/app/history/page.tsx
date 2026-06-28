import { getWatchlist } from "@/lib/data/repository";
import { getI18n } from "@/lib/i18n";
import { stockName } from "@/lib/constants";
import { isPriceSupported } from "@/lib/prices";
import { EVENT_KEYS, type EventKey } from "@/lib/history";
import { HistoryView } from "@/components/HistoryView";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, t } = getI18n();
  const watchlist = await getWatchlist();

  // 시세 지원되는 종목만 (전부 Yahoo 지원이지만 안전하게 필터)
  const companies = watchlist
    .filter((w) => isPriceSupported(w.ticker))
    .map((w) => ({ ticker: w.ticker, label: stockName(w.ticker, locale, w.companyName) }));

  const ev = typeof searchParams.event === "string" ? searchParams.event : undefined;
  const initialEvent = EVENT_KEYS.includes(ev as EventKey) ? (ev as EventKey) : undefined;
  const initialTicker = typeof searchParams.ticker === "string" ? searchParams.ticker : undefined;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">📊 {t.history.title}</h1>
      <HistoryView
        companies={companies}
        t={t}
        initialEvent={initialEvent}
        initialTicker={initialTicker}
      />
    </div>
  );
}
