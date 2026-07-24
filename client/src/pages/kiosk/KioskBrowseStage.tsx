import { MenuBrowseArea } from "@/components/menu/MenuBrowseArea";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useOrderingBrowse,
  useOrderingCart,
  useOrderingClientRuntime,
} from "@/lib/ordering-client";
import { Loader2 } from "lucide-react";

type Props = {
  slug: string;
  qs: string;
  bumpActivity: () => void;
};

/**
 * Kiosk browse chrome — consumes OrderingBrowseProvider only.
 * SELF-ORDERING-RUNTIME-IDENTITY-FIX-1 — cart nav via OrderingNavigator
 * (hosted stage update or URL) — never invent a second cart identity.
 */
export function KioskBrowseStage({ slug: _slug, qs: _qs, bumpActivity }: Props) {
  const { language } = useLanguage();
  const browse = useOrderingBrowse();
  const cart = useOrderingCart();
  const runtime = useOrderingClientRuntime();
  const currency =
    (runtime.restaurant as { currencySymbol?: string } | null)?.currencySymbol ??
    "ر.س";

  if (browse.presentationStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
      </div>
    );
  }

  if (browse.presentationStatus !== "ready") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8 text-center">
        {language === "ar" ? "القائمة غير متاحة" : "Menu unavailable"}
      </div>
    );
  }

  const accentColor = "#f97316";
  const textColor = "#ffffff";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-28" onClick={bumpActivity}>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold truncate">
          {language === "ar" ? "القائمة" : "Menu"}
        </h1>
        <button
          type="button"
          onClick={() => {
            bumpActivity();
            runtime.navigator?.goToCart();
          }}
          className="rounded-xl bg-orange-500 px-4 py-3 font-bold text-sm"
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
        accentColor={accentColor}
        textColor={textColor}
        searchBgStyle="rgba(15,23,42,0.95)"
        cardBg="rgba(255,255,255,0.06)"
        cardStyle="border border-white/10"
        currencySymbol={currency}
        canAddToCart
        searchSticky={false}
      />
    </div>
  );
}
