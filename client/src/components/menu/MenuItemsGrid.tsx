import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, UtensilsCrossed } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import { resolveImageUrl } from "@/lib/utils";
import type { MenuBrowseFontStyles } from "./menuBrowseTypes";

export type MenuItemsGridProps = {
  items: any[];
  searchQuery: string;
  accentColor: string;
  cardStyle: string;
  cardBg?: string;
  textColor?: string;
  pricePrefix?: string;
  currencySymbol?: string;
  fontStyles?: MenuBrowseFontStyles;
  tableNumber?: number;
  /**
   * When set, controls Add to Cart without requiring a table number
   * (kiosk / non-table channels). Mirrors OffersTabPanel.canAddToCart.
   */
  canAddToCart?: boolean;
};

function resolveCanAddToCart(
  canAddToCart: boolean | undefined,
  tableNumber: number | undefined
): boolean {
  if (canAddToCart !== undefined) return canAddToCart;
  return Boolean(tableNumber && tableNumber > 0);
}

export function MenuEmptyState({
  searchQuery,
  textColor,
}: {
  searchQuery: string;
  textColor: string;
}) {
  return (
    <div className="text-center py-16">
      <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: textColor }} />
      <p className="opacity-60" style={{ color: textColor }}>
        {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد أصناف في هذه الفئة"}
      </p>
    </div>
  );
}

function MenuItemGridCards({
  items,
  accentColor,
  cardStyle,
  cardBg,
  textColor,
  pricePrefix,
  currencySymbol,
  fontStyles,
  allowAddToCart,
}: {
  items: any[];
  accentColor: string;
  cardStyle: string;
  cardBg?: string;
  textColor: string;
  pricePrefix?: string;
  currencySymbol?: string;
  fontStyles?: MenuBrowseFontStyles;
  allowAddToCart: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`rounded-xl overflow-hidden ${cardStyle} ${!item.isAvailable ? "opacity-50" : ""}`}
            style={cardBg ? { background: cardBg } : undefined}
          >
            <div className="flex">
              {resolveImageUrl(item.imageUrl) ? (
                <img
                  src={resolveImageUrl(item.imageUrl)}
                  alt={item.nameAr}
                  className="w-40 h-40 sm:w-48 sm:h-48 object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center shrink-0"
                  style={{ background: `${accentColor}08` }}
                >
                  <UtensilsCrossed className="w-12 h-12 opacity-20" style={{ color: textColor }} />
                </div>
              )}
              <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3
                        className="font-bold text-base sm:text-lg truncate"
                        style={{
                          color: fontStyles?.headingColor || textColor,
                          ...fontStyles?.arStyle,
                          fontSize: fontStyles?.headingScale
                            ? `calc(1em * ${fontStyles.headingScale})`
                            : undefined,
                        }}
                      >
                        {item.nameAr}
                      </h3>
                      {item.nameEn && (
                        <p
                          className="text-sm truncate opacity-50"
                          style={{
                            color: fontStyles?.bodyColor || textColor,
                            ...fontStyles?.enStyle,
                            fontSize: fontStyles?.bodyScale
                              ? `calc(1em * ${fontStyles.bodyScale})`
                              : undefined,
                          }}
                          dir="ltr"
                        >
                          {item.nameEn}
                        </p>
                      )}
                      {item.calories && (
                        <p
                          className="text-sm mt-0.5 opacity-50"
                          style={{
                            color: fontStyles?.bodyColor || textColor,
                            ...fontStyles?.arStyle,
                          }}
                        >
                          🔥 {item.calories} سعرة
                        </p>
                      )}
                    </div>
                    {!item.isAvailable && (
                      <span
                        className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#ef444430", color: "#ef4444" }}
                      >
                        غير متوفر
                      </span>
                    )}
                  </div>
                  {item.descriptionAr && (
                    <p
                      className="text-sm mt-1 line-clamp-2 opacity-60"
                      style={{
                        color: fontStyles?.bodyColor || textColor,
                        ...fontStyles?.arStyle,
                      }}
                    >
                      {item.descriptionAr}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    className="text-xl font-bold"
                    style={{
                      color: fontStyles?.priceColor || accentColor,
                      ...fontStyles?.enStyle,
                      fontSize: fontStyles?.priceScale
                        ? `calc(1.25rem * ${fontStyles.priceScale})`
                        : undefined,
                    }}
                  >
                    {pricePrefix !== undefined ? pricePrefix : ""}
                    {item.price}{" "}
                    <span className="text-sm font-normal opacity-60" style={{ color: textColor }}>
                      {currencySymbol || "ر.س"}
                    </span>
                  </span>
                  {allowAddToCart && item.isAvailable && (
                    <AddToCartButton
                      menuItemId={item.id}
                      nameAr={item.nameAr}
                      nameEn={item.nameEn}
                      price={item.price}
                      imageUrl={item.imageUrl}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function MenuItemListCards({
  items,
  accentColor,
  cardStyle,
  cardBg,
  textColor,
  pricePrefix,
  currencySymbol,
  fontStyles,
  allowAddToCart,
}: {
  items: any[];
  accentColor: string;
  cardStyle: string;
  cardBg?: string;
  textColor: string;
  pricePrefix?: string;
  currencySymbol?: string;
  fontStyles?: MenuBrowseFontStyles;
  allowAddToCart: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25, delay: index * 0.03 }}
            className={`rounded-xl overflow-hidden ${cardStyle} ${!item.isAvailable ? "opacity-50" : ""}`}
            style={cardBg ? { background: cardBg } : undefined}
          >
            <div className="flex items-center gap-3 p-3">
              {resolveImageUrl(item.imageUrl) ? (
                <img
                  src={resolveImageUrl(item.imageUrl)}
                  alt={item.nameAr}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${accentColor}10` }}
                >
                  <UtensilsCrossed className="w-6 h-6 opacity-20" style={{ color: textColor }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className="font-bold text-sm truncate"
                    style={{
                      color: fontStyles?.headingColor || textColor,
                      ...fontStyles?.arStyle,
                      fontSize: fontStyles?.headingScale
                        ? `calc(1em * ${fontStyles.headingScale})`
                        : undefined,
                    }}
                  >
                    {item.nameAr}
                  </h3>
                  {!item.isAvailable && (
                    <span
                      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "#ef444430", color: "#ef4444" }}
                    >
                      غير متوفر
                    </span>
                  )}
                </div>
                {item.nameEn && (
                  <p
                    className="text-xs truncate opacity-50"
                    style={{
                      color: fontStyles?.bodyColor || textColor,
                      ...fontStyles?.enStyle,
                      fontSize: fontStyles?.bodyScale
                        ? `calc(1em * ${fontStyles.bodyScale})`
                        : undefined,
                    }}
                    dir="ltr"
                  >
                    {item.nameEn}
                  </p>
                )}
                {item.descriptionAr && (
                  <p
                    className="text-xs mt-0.5 truncate opacity-50"
                    style={{
                      color: fontStyles?.bodyColor || textColor,
                      ...fontStyles?.arStyle,
                    }}
                  >
                    {item.descriptionAr}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-left flex flex-col items-end gap-1">
                <span
                  className="text-base font-bold"
                  style={{
                    color: fontStyles?.priceColor || accentColor,
                    ...fontStyles?.enStyle,
                    fontSize: fontStyles?.priceScale
                      ? `calc(1rem * ${fontStyles.priceScale})`
                      : undefined,
                  }}
                >
                  {pricePrefix !== undefined ? pricePrefix : ""}
                  {item.price}
                </span>
                <span className="text-[10px] block opacity-60" style={{ color: textColor }}>
                  {currencySymbol || "ر.س"}
                </span>
                {allowAddToCart && item.isAvailable && (
                  <AddToCartButton
                    menuItemId={item.id}
                    nameAr={item.nameAr}
                    nameEn={item.nameEn}
                    price={item.price}
                    imageUrl={item.imageUrl}
                  />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Shared browse items grid/list (QR MenuTemplates + Self Ordering Kiosk).
 * Owns image, description, calories, availability, and pricing presentation.
 */
export function MenuItemsGrid({
  items,
  searchQuery,
  accentColor,
  cardStyle,
  cardBg,
  textColor,
  pricePrefix,
  currencySymbol,
  fontStyles,
  tableNumber,
  canAddToCart,
}: MenuItemsGridProps) {
  const tc = textColor || "white";
  const allowAddToCart = resolveCanAddToCart(canAddToCart, tableNumber);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("menuViewMode") as "grid" | "list") || "grid";
    }
    return "grid";
  });

  const toggleView = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("menuViewMode", mode);
  };

  const ViewToggle = () => (
    <div className="flex items-center gap-1 mb-4 justify-end">
      <button
        type="button"
        onClick={() => toggleView("grid")}
        className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
        style={{
          background: viewMode === "grid" ? `${accentColor}20` : "transparent",
          color: viewMode === "grid" ? accentColor : tc,
        }}
        title="عرض شبكة"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => toggleView("list")}
        className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
        style={{
          background: viewMode === "list" ? `${accentColor}20` : "transparent",
          color: viewMode === "list" ? accentColor : tc,
        }}
        title="عرض قائمة"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );

  const cards =
    viewMode === "grid" ? (
      <MenuItemGridCards
        items={items}
        accentColor={accentColor}
        cardStyle={cardStyle}
        cardBg={cardBg}
        textColor={tc}
        pricePrefix={pricePrefix}
        currencySymbol={currencySymbol}
        fontStyles={fontStyles}
        allowAddToCart={allowAddToCart}
      />
    ) : (
      <MenuItemListCards
        items={items}
        accentColor={accentColor}
        cardStyle={cardStyle}
        cardBg={cardBg}
        textColor={tc}
        pricePrefix={pricePrefix}
        currencySymbol={currencySymbol}
        fontStyles={fontStyles}
        allowAddToCart={allowAddToCart}
      />
    );

  if (searchQuery) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm opacity-60" style={{ color: tc }}>
            نتائج البحث عن "{searchQuery}" ({items.length} صنف)
          </p>
          <ViewToggle />
        </div>
        {items.length === 0 ? <MenuEmptyState searchQuery={searchQuery} textColor={tc} /> : cards}
      </>
    );
  }
  if (!items.length) return <MenuEmptyState searchQuery="" textColor={tc} />;
  return (
    <>
      <ViewToggle />
      {cards}
    </>
  );
}
