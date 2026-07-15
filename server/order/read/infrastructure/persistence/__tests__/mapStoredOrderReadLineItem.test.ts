import { describe, expect, it } from "vitest";
import {
  mapStoredOrderReadLineItem,
  toPersistedLineItemColumns,
} from "../mapStoredOrderReadLineItem";
import {
  ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
  ORDER_LINE_PROJECTION_TYPE_OFFER,
} from "../../../domain/contracts/lineProjectionContracts";
import { sampleCategoryProjection } from "../../../__tests__/fixtures/categoryProjectionFixtures";

describe("mapStoredOrderReadLineItem", () => {
  it("maps menu item rows with category projection and itemNotes", () => {
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
      itemNotes: "  No oil  ",
      modifiers: ["  Extra garlic  ", ""],
      lineProjectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
      categoryProjection: category,
      offerProjection: null,
    });

    expect(dto.projectionType).toBe(ORDER_LINE_PROJECTION_TYPE_MENU_ITEM);
    expect(dto.itemNotes).toBe("No oil");
    expect(dto.modifiers).toEqual(["Extra garlic"]);
    if (dto.projectionType === ORDER_LINE_PROJECTION_TYPE_MENU_ITEM) {
      expect(dto.category.categoryId).toBe(2);
    }
  });

  it("maps offer rows without category projection and preserves itemNotes", () => {
    const dto = mapStoredOrderReadLineItem({
      restaurantId: 1,
      orderId: 10,
      lineItemId: 6,
      menuItemId: 0,
      nameAr: "عرض",
      nameEn: "Offer",
      quantity: 1,
      price: "20.00",
      itemNotes: "Extra napkins",
      modifiers: ["Large"],
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
    expect(dto.itemNotes).toBe("Extra napkins");
    expect(dto.modifiers).toEqual(["Large"]);
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
      itemNotes: null,
      modifiers: null,
      lineProjectionType: "MenuItem",
      categoryProjection: null,
      offerProjection: null,
    });

    expect(dto.projectionType).toBe(ORDER_LINE_PROJECTION_TYPE_OFFER);
    expect(dto.itemNotes).toBeNull();
    expect(dto.modifiers).toEqual([]);
  });

  it("persists itemNotes and modifiers through toPersistedLineItemColumns round-trip", () => {
    const category = sampleCategoryProjection({ categoryId: 3 });
    const persisted = toPersistedLineItemColumns({
      projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
      lineItemId: 11,
      menuItemId: 22,
      nameAr: "بيتزا",
      nameEn: "Pizza",
      quantity: 1,
      price: "30.00",
      itemNotes: "Cut into 8 slices",
      modifiers: ["No onion", "Extra cheese"],
      category,
    });

    expect(persisted.itemNotes).toBe("Cut into 8 slices");
    expect(persisted.modifiers).toEqual(["No onion", "Extra cheese"]);
    expect(persisted.menuItemId).toBe(22);

    const roundTrip = mapStoredOrderReadLineItem({
      restaurantId: 1,
      orderId: 99,
      lineItemId: 11,
      menuItemId: persisted.menuItemId,
      nameAr: persisted.nameAr,
      nameEn: persisted.nameEn,
      quantity: persisted.quantity,
      price: persisted.price,
      itemNotes: persisted.itemNotes,
      modifiers: persisted.modifiers,
      lineProjectionType: persisted.lineProjectionType,
      categoryProjection: persisted.categoryProjection,
      offerProjection: persisted.offerProjection,
    });

    expect(roundTrip.itemNotes).toBe("Cut into 8 slices");
    expect(roundTrip.modifiers).toEqual(["No onion", "Extra cheese"]);
  });
});
