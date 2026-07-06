import { describe, expect, it } from "vitest";
import {
  OrderCategoryProjectionBuilder,
  CategoryProjectionValidationError,
} from "../OrderCategoryProjectionBuilder";
import type { CategoryResolutionPort } from "./CategoryResolutionPort";
import { OrderCategoryProjectionMetrics } from "../../../infrastructure/monitoring/OrderCategoryProjectionMetrics";

function mockResolver(
  entries: Record<number, { categoryId: number; nameAr: string; nameEn?: string | null }>
): CategoryResolutionPort {
  return {
    async batchResolveMenuItemCategories(_restaurantId, menuItemIds) {
      const map = new Map();
      for (const menuItemId of menuItemIds) {
        const entry = entries[menuItemId];
        if (!entry) continue;
        map.set(menuItemId, {
          categoryId: entry.categoryId,
          nameAr: entry.nameAr,
          nameEn: entry.nameEn ?? null,
          sortOrder: 0,
          updatedAt: "2026-06-27 10:00:00",
        });
      }
      return map;
    },
  };
}

describe("OrderCategoryProjectionBuilder", () => {
  it("builds immutable category projection for each line item", async () => {
    const metrics = new OrderCategoryProjectionMetrics();
    const builder = new OrderCategoryProjectionBuilder(
      mockResolver({ 9: { categoryId: 3, nameAr: "مقبلات", nameEn: "Starters" } }),
      metrics
    );

    const lineItems = await builder.buildLineItems(7, [
      {
        id: 1,
        orderId: 42,
        menuItemId: 9,
        nameAr: "حمص",
        nameEn: "Hummus",
        price: "12.75",
        quantity: 2,
        notes: null,
        createdAt: "2026-06-27 10:00:00",
      },
    ]);

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0]?.category.categoryId).toBe(3);
    expect(lineItems[0]?.category.categoryCode).toBe("cat-3");
    expect(lineItems[0]?.category.categoryName).toBe("Starters");
    expect(Object.isFrozen(lineItems[0]?.category)).toBe(true);
    expect(metrics.snapshot().projectionCount).toBe(1);
  });

  it("fails projection when category cannot be resolved", async () => {
    const builder = new OrderCategoryProjectionBuilder(mockResolver({}));

    await expect(
      builder.buildLineItems(7, [
        {
          id: 1,
          orderId: 42,
          menuItemId: 99,
          nameAr: "حمص",
          nameEn: "Hummus",
          price: "12.75",
          quantity: 2,
          notes: null,
          createdAt: "2026-06-27 10:00:00",
        },
      ])
    ).rejects.toBeInstanceOf(CategoryProjectionValidationError);
  });
});
