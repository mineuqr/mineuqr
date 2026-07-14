import { MenuOffersTabBar } from "./MenuOffersTabBar";
import { OffersTabPanel } from "./OffersTabPanel";
import { MenuSearchAndCategories } from "./MenuSearchAndCategories";
import { MenuItemsGrid } from "./MenuItemsGrid";
import type { MenuBrowseTab } from "./types";
import type { MenuBrowseFontStyles } from "./menuBrowseTypes";

export type MenuBrowseAreaProps = {
  menuTab: MenuBrowseTab;
  setMenuTab: (tab: MenuBrowseTab) => void;
  offers?: any[];
  categories: any[];
  activeCategoryId: number | null;
  setActiveCategoryId: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredItems: any[];
  accentColor: string;
  textColor: string;
  searchBgStyle: string;
  cardBg: string;
  cardStyle: string;
  currencySymbol: string;
  fontStyles?: MenuBrowseFontStyles;
  tableNumber?: number;
  pillStyle?: string;
  pricePrefix?: string;
  /**
   * KIOSK-BROWSE-PRESENTATION-ADOPTION-1 — channel cart gate for items + offers.
   * When unset, QR tableNumber gating is preserved.
   */
  canAddToCart?: boolean;
  /** Disable sticky search bar when outer chrome already sticky (kiosk). */
  searchSticky?: boolean;
};

/**
 * Shared Ordering Browse presentation surface used by QR templates and Kiosk.
 * Owns offers tab, search/categories, and item grid/list presentation.
 */
export function MenuBrowseArea({
  menuTab,
  setMenuTab,
  offers = [],
  categories,
  activeCategoryId,
  setActiveCategoryId,
  searchQuery,
  setSearchQuery,
  filteredItems,
  accentColor,
  textColor,
  searchBgStyle,
  cardBg,
  cardStyle,
  currencySymbol,
  fontStyles,
  tableNumber,
  pillStyle,
  pricePrefix,
  canAddToCart,
  searchSticky = true,
}: MenuBrowseAreaProps) {
  const hasOffers = offers.length > 0;
  const showOffers = hasOffers && menuTab === "offers";

  return (
    <>
      <MenuOffersTabBar
        visible={hasOffers}
        activeTab={menuTab}
        onTabChange={setMenuTab}
        accentColor={accentColor}
        textColor={textColor}
        offerCount={offers.length}
      />
      {showOffers ? (
        <OffersTabPanel
          offers={offers}
          accentColor={accentColor}
          textColor={textColor}
          cardBg={cardBg}
          currencySymbol={currencySymbol}
          fontStyles={fontStyles}
          tableNumber={tableNumber}
          canAddToCart={canAddToCart}
        />
      ) : (
        <>
          <MenuSearchAndCategories
            categories={categories}
            activeCategoryId={activeCategoryId}
            setActiveCategoryId={setActiveCategoryId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            accentColor={accentColor}
            bgStyle={searchBgStyle}
            textColor={textColor}
            pillStyle={pillStyle}
            sticky={searchSticky}
          />
          <main className="container py-6">
            <MenuItemsGrid
              items={filteredItems}
              searchQuery={searchQuery}
              accentColor={accentColor}
              cardStyle={cardStyle}
              cardBg={cardBg}
              textColor={textColor}
              pricePrefix={pricePrefix}
              currencySymbol={currencySymbol}
              fontStyles={fontStyles}
              tableNumber={tableNumber}
              canAddToCart={canAddToCart}
            />
          </main>
        </>
      )}
    </>
  );
}
