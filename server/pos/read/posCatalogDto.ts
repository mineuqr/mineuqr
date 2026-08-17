/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * POS sale catalog DTO. Menu rows remain owned by Restaurant/Menu.
 * Price stays a decimal string. No floating-point conversion.
 * Category names and imageUrl are Menu-owned projections, not a POS catalog.
 */

export type PosCatalogItemDto = {
  menuItemId: number;
  categoryId: number;
  categoryNameAr: string | null;
  categoryNameEn: string | null;
  nameAr: string;
  nameEn: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
};

export type PosMenuItemRecord = {
  id: number;
  categoryId: number;
  restaurantId: number;
  nameAr: string;
  nameEn: string | null;
  price: string | number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
};

export type PosCategoryRecord = {
  id: number;
  restaurantId: number;
  nameAr: string;
  nameEn: string | null;
};

export const POS_CATALOG_MAX_ITEMS = 500 as const;

export function toPosCatalogItemDto(
  row: PosMenuItemRecord,
  category?: PosCategoryRecord | null
): PosCatalogItemDto {
  const imageUrl = row.imageUrl?.trim() ? row.imageUrl.trim() : null;
  return {
    menuItemId: row.id,
    categoryId: row.categoryId,
    categoryNameAr: category?.nameAr ?? null,
    categoryNameEn: category?.nameEn ?? null,
    nameAr: row.nameAr,
    nameEn: row.nameEn ?? null,
    price: typeof row.price === "string" ? row.price : String(row.price),
    imageUrl,
    isAvailable: row.isAvailable,
    sortOrder: row.sortOrder,
  };
}
