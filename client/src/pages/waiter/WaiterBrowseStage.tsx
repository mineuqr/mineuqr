import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { MenuBrowseArea } from "@/components/menu/MenuBrowseArea";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useOrderingBrowse,
  useOrderingCart,
  useOrderingClientRuntime,
} from "@/lib/ordering-client";

type Props = {
  slug: string;
  qs: string;
  tableNumber: number;
  onBackToTables: () => void;
};

/**
 * Waiter browse chrome — consumes OrderingBrowseProvider + shared MenuBrowseArea.
 */
export function WaiterBrowseStage({
  slug,
  qs,
  tableNumber,
  onBackToTables,
}: Props) {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const browse = useOrderingBrowse();
  const cart = useOrderingCart();
  const runtime = useOrderingClientRuntime();
  const currency =
    (runtime.restaurant as { currencySymbol?: string } | null)?.currencySymbol ??
    "ر.س";

  if (browse.presentationStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  if (browse.presentationStatus !== "ready") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8 text-center">
        {language === "ar" ? "القائمة غير متاحة" : "Menu unavailable"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-28">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBackToTables}
            className="text-xs text-white/60 mb-1"
          >
            {language === "ar" ? "← الطاولات" : "← Tables"}
          </button>
          <h1 className="text-2xl font-bold truncate">
            {language === "ar" ? `طاولة ${tableNumber}` : `Table ${tableNumber}`}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setLocation(`/waiter/${slug}/cart?${qs}`)}
          className="rounded-xl bg-teal-500 px-4 py-3 font-bold text-sm text-slate-950"
        >
          {language === "ar" ? "السلة" : "Cart"} ({cart.totalItems})
        </button>
      </header>

      <MenuBrowseArea
        menuTab={browse.menuTab}
        setMenuTab={(tab) => browse.setMenuTab(tab)}
        offers={browse.offers ?? []}
        categories={browse.categories}
        activeCategoryId={browse.activeCategoryId}
        setActiveCategoryId={(id) => browse.setActiveCategoryId(id)}
        searchQuery={browse.searchQuery}
        setSearchQuery={(q) => browse.setSearchQuery(q)}
        filteredItems={browse.filteredItems}
        accentColor="#14b8a6"
        textColor="#ffffff"
        searchBgStyle="rgba(15,23,42,0.95)"
        cardBg="rgba(255,255,255,0.06)"
        cardStyle="border border-white/10"
        currencySymbol={currency}
        tableNumber={tableNumber}
        canAddToCart
        searchSticky={false}
      />
    </div>
  );
}
