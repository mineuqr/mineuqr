/**
 * Category resolution port — resolves menu item → category metadata once at projection build.
 */
export type ResolvedCategorySource = Readonly<{
  categoryId: number;
  nameAr: string;
  nameEn: string | null;
  sortOrder: number;
  updatedAt: string;
}>;

export interface CategoryResolutionPort {
  batchResolveMenuItemCategories(
    restaurantId: number,
    menuItemIds: readonly number[]
  ): Promise<Map<number, ResolvedCategorySource>>;
}
