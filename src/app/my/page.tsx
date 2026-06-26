import { getEvents, getWatchlist } from "@/lib/data/repository";
import { getI18n } from "@/lib/i18n";
import { stockName } from "@/lib/constants";
import { MyStocksView } from "@/components/MyStocksView";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// "내 종목" 페이지.
// 서버에서 전체 이벤트 + 관심종목 목록을 가져와, 클라이언트 뷰에
// 넘긴다. 실제 종목 선택/필터는 클라이언트(localStorage)에서 처리.
// ─────────────────────────────────────────────────────────────

export default async function MyStocksPage() {
  const { locale, t } = getI18n();
  const [events, watchlist] = await Promise.all([
    getEvents({ range: "all" }),
    getWatchlist(),
  ]);

  // 선택 가능한 종목 목록 (관심종목 우선순위 순서)
  const companies = watchlist.map((w) => ({
    ticker: w.ticker,
    label: stockName(w.ticker, locale, w.companyName),
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">{t.my.title}</h1>
      <MyStocksView events={events} companies={companies} t={t} locale={locale} />
    </div>
  );
}
