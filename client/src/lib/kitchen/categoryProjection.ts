/**
 * ORDER-READ-CATEGORY-PROJECTION-1 — client mirror of canonical category projection.
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

export type CategoryProjectionIntegrity = "valid" | "invalid";

export type CategoryProjectionReadMeta = {
  categoryProjectionVersion: number;
  projectionBuildDurationMs: number;
  projectionIntegrity: CategoryProjectionIntegrity;
};
