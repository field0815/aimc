import { getWatchlist } from "@/lib/data/repository";
import { getI18n } from "@/lib/i18n";
import { stockName } from "@/lib/constants";
import { isPriceSupported } from "@/lib/prices";
import { SeedMoneyView } from "@/components/SeedMoneyView";

export const dynamic = "force-dynamic";

export default async function SeedPage() {
  const { locale, t } = getI18n();
  const watchlist = await getWatchlist();

  const companies = watchlist.map((w) => ({
    ticker: w.ticker,
    label: stockName(w.ticker, locale, w.companyName),
    supported: isPriceSupported(w.ticker),
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">💰 {t.seed.title}</h1>
      <SeedMoneyView companies={companies} t={t} locale={locale} />
    </div>
  );
}
