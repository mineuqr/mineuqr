import type { OrderCategoryProjection } from "@/lib/kitchen/categoryProjection";

export function mockCategoryProjection(
  overrides: Partial<OrderCategoryProjection> = {}
): OrderCategoryProjection {
  return Object.freeze({
    categoryId: 1,
    categoryCode: "cat-1",
    categoryName: "Starters",
    displayOrder: 0,
    parentCategoryId: null,
    version: 1_700_000_000_000,
    updatedAt: "2026-06-27T10:00:00.000Z",
    ...overrides,
  });
}
