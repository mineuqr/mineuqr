/**
 * POS-READ-APIS-IMPLEMENTATION-1
 * POS sale catalog DTO. Menu rows remain owned by Restaurant/Menu.
 * Price stays a decimal string. No floating-point conversion.
 */

export type PosCatalogItemDto = {
  menuItemId: number;
  categoryId: number;
  nameAr: string;
  nameEn: string | null;
  price: string;
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
  isAvailable: boolean;
  sortOrder: number;
};

export const POS_CATALOG_MAX_ITEMS = 500 as const;

export function toPosCatalogItemDto(row: PosMenuItemRecord): PosCatalogItemDto {
  return {
    menuItemId: row.id,
    categoryId: row.categoryId,
    nameAr: row.nameAr,
    nameEn: row.nameEn ?? null,
    price: typeof row.price === "string" ? row.price : String(row.price),
    isAvailable: row.isAvailable,
    sortOrder: row.sortOrder,
  };
}
