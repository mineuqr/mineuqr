/**
 * ORDERING-CLIENT-BROWSE-1 — shared browse state contracts (ADR-ARCH-018).
 */

export type OrderingBrowseTab = "menu" | "offers";

export type BrowsePresentationStatus =
  | "loading"
  | "not_found"
  | "unavailable"
  | "ready";

export type OrderingBrowseCatalogItem = {
  id: number;
  categoryId?: number | null;
  nameAr: string;
  nameEn?: string | null;
  descriptionAr?: string | null;
  [key: string]: unknown;
};

export type OrderingBrowseCategory = {
  id: number;
  [key: string]: unknown;
};
