import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { categories, menuItems } from "../../../../../drizzle/schema";
import type {
  CategoryResolutionPort,
  ResolvedCategorySource,
} from "../../projections/builders/CategoryResolutionPort";

/**
 * Resolves category metadata from menu items — used only during projection build.
 */
export class DrizzleCategoryResolutionPort implements CategoryResolutionPort {
  async batchResolveMenuItemCategories(
    restaurantId: number,
    menuItemIds: readonly number[]
  ): Promise<Map<number, ResolvedCategorySource>> {
    const result = new Map<number, ResolvedCategorySource>();
    if (menuItemIds.length === 0) return result;

    const db = await getDb();
    if (!db) return result;

    const uniqueIds = Array.from(new Set(menuItemIds));
    const items = await db
      .select({
        menuItemId: menuItems.id,
        categoryId: menuItems.categoryId,
      })
      .from(menuItems)
      .where(
        and(eq(menuItems.restaurantId, restaurantId), inArray(menuItems.id, uniqueIds))
      );

    if (items.length === 0) return result;

    const categoryIds = Array.from(new Set(items.map((item) => item.categoryId)));
    const categoryRows = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.restaurantId, restaurantId), inArray(categories.id, categoryIds))
      );

    const categoryById = new Map(categoryRows.map((row) => [row.id, row]));

    for (const item of items) {
      const category = categoryById.get(item.categoryId);
      if (!category) continue;
      result.set(item.menuItemId, {
        categoryId: category.id,
        nameAr: category.nameAr,
        nameEn: category.nameEn ?? null,
        sortOrder: category.sortOrder,
        updatedAt: category.updatedAt,
      });
    }

    return result;
  }
}

export const drizzleCategoryResolutionPort = new DrizzleCategoryResolutionPort();
