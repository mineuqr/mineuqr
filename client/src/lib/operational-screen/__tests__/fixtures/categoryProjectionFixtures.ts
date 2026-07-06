import type { OrderCategoryProjection } from "@/lib/kitchen/categoryProjection";

export function mockCategoryProjection(
  overrides: Partial<OrderCategoryProjection> = {}
): OrderCategoryProjection {
  const categoryId = overrides.categoryId ?? 1;
  return Object.freeze({
    categoryName: "Starters",
    displayOrder: 0,
    parentCategoryId: null,
    version: 1_700_000_000_000,
    updatedAt: "2026-06-27T10:00:00.000Z",
    ...overrides,
    categoryId,
    categoryCode: overrides.categoryCode ?? `cat-${categoryId}`,
  });
}
