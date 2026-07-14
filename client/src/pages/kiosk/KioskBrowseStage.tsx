import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import { MenuOffersTabBar } from "@/components/menu/MenuOffersTabBar";
import { OffersTabPanel } from "@/components/menu/OffersTabPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useOrderingBrowse,
  useOrderingCart,
  useOrderingClientRuntime,
} from "@/lib/ordering-client";

type Props = {
  slug: string;
  qs: string;
  bumpActivity: () => void;
};

/**
 * Kiosk browse chrome — consumes OrderingBrowseProvider only.
 * KIOSK-PRESENTATION-ADOPTION-1 — adopts shared Special Offers presentation
 * (MenuOffersTabBar + OffersTabPanel) without Runtime/DTO changes.
 */
export function KioskBrowseStage({ slug, qs, bumpActivity }: Props) {
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

  const offers = browse.offers ?? [];
  const hasOffers = offers.length > 0;
  const accentColor = "#f97316";
  const textColor = "#ffffff";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-28">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold truncate">
          {language === "ar" ? "القائمة" : "Menu"}
        </h1>
        <button
          type="button"
          onClick={() => {
            bumpActivity();
            setLocation(`/kiosk/${slug}/cart?${qs}`);
          }}
          className="rounded-xl bg-orange-500 px-4 py-3 font-bold text-sm"
        >
          {language === "ar" ? "السلة" : "Cart"} ({cart.totalItems})
        </button>
      </header>

      <div onClick={bumpActivity}>
        <MenuOffersTabBar
          activeTab={browse.menuTab}
          onTabChange={(tab) => browse.setMenuTab(tab)}
          accentColor={accentColor}
          textColor={textColor}
          visible={hasOffers}
          offerCount={offers.length}
        />
      </div>

      {browse.menuTab === "offers" && hasOffers ? (
        <div className="px-2" onClick={bumpActivity}>
          <OffersTabPanel
            offers={offers}
            accentColor={accentColor}
            textColor={textColor}
            cardBg="rgba(255,255,255,0.06)"
            currencySymbol={currency}
            canAddToCart
          />
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {browse.categories.map((cat) => {
              const name =
                language === "ar"
                  ? String((cat as { nameAr?: string }).nameAr ?? cat.id)
                  : String(
                      (cat as { nameEn?: string }).nameEn ??
                        (cat as { nameAr?: string }).nameAr ??
                        cat.id
                    );
              const active = browse.activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    bumpActivity();
                    browse.setActiveCategoryId(cat.id);
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                    active ? "bg-orange-500 text-white" : "bg-white/10 text-white/80"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <ul className="px-4 space-y-3">
            {browse.filteredItems.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-lg truncate">
                    {language === "ar"
                      ? item.nameAr
                      : item.nameEn || item.nameAr}
                  </p>
                  <p className="text-orange-300 font-bold mt-1">
                    {String((item as { price?: string }).price ?? "")} {currency}
                  </p>
                </div>
                <div onClick={bumpActivity}>
                  <AddToCartButton
                    menuItemId={item.id}
                    nameAr={item.nameAr}
                    nameEn={item.nameEn ?? undefined}
                    price={String((item as { price?: string }).price ?? "0")}
                    imageUrl={
                      (item as { imageUrl?: string }).imageUrl ?? undefined
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
