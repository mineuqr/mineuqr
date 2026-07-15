import { describe, expect, it } from "vitest";
import { OrderReadLineItemProjectionBuilder } from "../OrderReadLineItemProjectionBuilder";
import { OrderCategoryProjectionBuilder } from "../OrderCategoryProjectionBuilder";
import { ORDER_LINE_PROJECTION_TYPE_MENU_ITEM, ORDER_LINE_PROJECTION_TYPE_OFFER } from "../../../domain/contracts/lineProjectionContracts";
import type { CategoryResolutionPort } from "../CategoryResolutionPort";

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

describe("OrderReadLineItemProjectionBuilder", () => {
  const builder = new OrderReadLineItemProjectionBuilder(
    new OrderCategoryProjectionBuilder(mockResolver({ 9: { categoryId: 3, nameAr: "مقبلات", nameEn: "Starters" } }))
  );

  it("routes menu and offer lines to distinct projections", async () => {
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
        modifiers: ["Extra tahini"],
        createdAt: "2026-06-27 10:00:00",
      },
      {
        id: 2,
        orderId: 42,
        menuItemId: 0,
        nameAr: "عرض",
        nameEn: "Offer",
        price: "30.00",
        quantity: 1,
        notes: null,
        modifiers: null,
        createdAt: "2026-06-27 10:00:00",
      },
    ]);

    expect(lineItems).toHaveLength(2);
    expect(lineItems[0]?.projectionType).toBe(ORDER_LINE_PROJECTION_TYPE_MENU_ITEM);
    expect(lineItems[0]).toHaveProperty("category");
    expect(lineItems[0]?.modifiers).toEqual(["Extra tahini"]);
    expect(lineItems[1]?.projectionType).toBe(ORDER_LINE_PROJECTION_TYPE_OFFER);
    expect(lineItems[1]).toHaveProperty("offer");
    expect(lineItems[1]?.modifiers).toEqual([]);
    expect(lineItems[1]).not.toHaveProperty("category");
  });
});
