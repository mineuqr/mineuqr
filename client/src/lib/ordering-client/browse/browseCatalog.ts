/**
 * ORDERING-CLIENT-BROWSE-1 — pure browse catalog helpers.
 * Single source for filter / default category / tab resolution.
 */
import type {
  BrowsePresentationStatus,
  OrderingBrowseCatalogItem,
  OrderingBrowseCategory,
  OrderingBrowseTab,
} from "./browseTypes";

export function filterBrowseItems(
  items: OrderingBrowseCatalogItem[] | null | undefined,
  activeCategoryId: number | null,
  searchQuery: string
): OrderingBrowseCatalogItem[] {
  if (!items) return [];
  let next = items;
  if (activeCategoryId) {
    next = next.filter((item) => item.categoryId === activeCategoryId);
  }
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    next = next.filter(
      (item) =>
        item.nameAr.toLowerCase().includes(q) ||
        (item.nameEn != null && item.nameEn.toLowerCase().includes(q)) ||
        (item.descriptionAr != null &&
          item.descriptionAr.toLowerCase().includes(q))
    );
  }
  return next;
}

/** Select first category when none active — preserves prior MenuView behaviour. */
export function resolveDefaultCategoryId(
  categories: OrderingBrowseCategory[] | null | undefined,
  activeCategoryId: number | null
): number | null {
  if (activeCategoryId != null) return activeCategoryId;
  if (categories?.length) return categories[0]!.id;
  return null;
}

/** Drop offers tab when catalog has no offers. */
export function resolveBrowseMenuTab(
  menuTab: OrderingBrowseTab,
  offerCount: number
): OrderingBrowseTab {
  if (!offerCount && menuTab === "offers") return "menu";
  return menuTab;
}

export function resolveBrowsePresentationStatus(input: {
  isLoading: boolean;
  restaurant: { isActive?: boolean } | null | undefined;
}): BrowsePresentationStatus {
  if (input.isLoading) return "loading";
  if (!input.restaurant) return "not_found";
  if (input.restaurant.isActive === false) return "unavailable";
  return "ready";
}
