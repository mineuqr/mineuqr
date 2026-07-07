import { describe, expect, it } from "vitest";
import { mapStoredOrderReadLineItem } from "../mapStoredOrderReadLineItem";
import { ORDER_LINE_PROJECTION_TYPE_MENU_ITEM, ORDER_LINE_PROJECTION_TYPE_OFFER } from "../../../domain/contracts/lineProjectionContracts";
import { sampleCategoryProjection } from "../../../__tests__/fixtures/categoryProjectionFixtures";

describe("mapStoredOrderReadLineItem", () => {
  it("maps menu item rows with category projection", () => {
    const category = sampleCategoryProjection({ categoryId: 2 });
    const dto = mapStoredOrderReadLineItem({
      restaurantId: 1,
      orderId: 10,
      lineItemId: 5,
      menuItemId: 9,
      nameAr: "حمص",
      nameEn: "Hummus",
      quantity: 1,
      price: "10.00",
      lineProjectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
      categoryProjection: category,
      offerProjection: null,
    });

    expect(dto.projectionType).toBe(ORDER_LINE_PROJECTION_TYPE_MENU_ITEM);
    if (dto.projectionType === ORDER_LINE_PROJECTION_TYPE_MENU_ITEM) {
      expect(dto.category.categoryId).toBe(2);
    }
  });

  it("maps offer rows without category projection", () => {
    const dto = mapStoredOrderReadLineItem({
      restaurantId: 1,
      orderId: 10,
      lineItemId: 6,
      menuItemId: 0,
      nameAr: "عرض",
      nameEn: "Offer",
      quantity: 1,
      price: "20.00",
      lineProjectionType: ORDER_LINE_PROJECTION_TYPE_OFFER,
      categoryProjection: null,
      offerProjection: {
        lineKind: "offer",
        offerId: null,
        titleAr: "عرض",
        titleEn: "Offer",
        source: "order_line_snapshot",
        version: 1_700_000_000_000,
        updatedAt: "2026-06-27 10:00:00",
      },
    });

    expect(dto.projectionType).toBe(ORDER_LINE_PROJECTION_TYPE_OFFER);
    if (dto.projectionType === ORDER_LINE_PROJECTION_TYPE_OFFER) {
      expect(dto.offer.lineKind).toBe("offer");
      expect(dto.offer.titleAr).toBe("عرض");
    }
  });

  it("infers offer projection for legacy rows with menuItemId = 0", () => {
    const dto = mapStoredOrderReadLineItem({
      restaurantId: 1,
      orderId: 10,
      lineItemId: 7,
      menuItemId: 0,
      nameAr: "عرض قديم",
      nameEn: null,
      quantity: 1,
      price: "15.00",
      lineProjectionType: "MenuItem",
      categoryProjection: null,
      offerProjection: null,
    });

    expect(dto.projectionType).toBe(ORDER_LINE_PROJECTION_TYPE_OFFER);
  });
});
