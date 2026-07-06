/**
 * ORDER-READ-CATEGORY-PROJECTION-1 — canonical immutable category projection.
 * Single source of category truth for order read line items.
 */
export type OrderCategoryProjection = Readonly<{
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  displayOrder: number;
  parentCategoryId: number | null;
  version: number;
  updatedAt: string;
}>;

export const ORDER_CATEGORY_PROJECTION_SCHEMA_VERSION = 1 as const;

export type CategoryProjectionIntegrity = "valid" | "invalid";

export type CategoryProjectionReadMeta = {
  categoryProjectionVersion: number;
  projectionBuildDurationMs: number;
  projectionIntegrity: CategoryProjectionIntegrity;
};

export function categoryProjectionVersion(projection: OrderCategoryProjection): number {
  return projection.version;
}

export function maxCategoryProjectionVersion(
  projections: readonly OrderCategoryProjection[]
): number {
  if (projections.length === 0) return 0;
  return Math.max(...projections.map((p) => p.version));
}
