import type { OrderCategoryProjection } from "../../domain/contracts/categoryProjectionContracts";
import type { ActiveOrderLineItemDto } from "../../domain/contracts/queryContracts";

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
  overrides: Partial<ActiveOrderLineItemDto> = {}
): ActiveOrderLineItemDto {
  return {
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
