import type { OrderCategoryProjection } from "../../domain/contracts/categoryProjectionContracts";
import type { MenuItemOrderLineItemDto } from "../../domain/contracts/queryContracts";
import { ORDER_LINE_PROJECTION_TYPE_MENU_ITEM } from "../../domain/contracts/lineProjectionContracts";

export function sampleCategoryProjection(
  overrides: Partial<OrderCategoryProjection> = {}
): OrderCategoryProjection {
  const categoryId = overrides.categoryId ?? 1;
  return Object.freeze({
    categoryName: "Starters",
    displayOrder: 0,
    parentCategoryId: null,
    version: 1_700_000_000_000,
    updatedAt: "2026-06-27 10:00:00",
    ...overrides,
    categoryId,
    categoryCode: overrides.categoryCode ?? `cat-${categoryId}`,
  });
}

export function sampleActiveLineItem(
  overrides: Partial<MenuItemOrderLineItemDto> = {}
): MenuItemOrderLineItemDto {
  return {
    projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
    lineItemId: 1,
    menuItemId: 9,
    nameAr: "حمص",
    nameEn: "Hummus",
    quantity: 2,
    price: "12.75",
    category: sampleCategoryProjection(),
    ...overrides,
  };
}
