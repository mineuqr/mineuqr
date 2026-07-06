import type { OrderCategoryProjection } from "../../domain/contracts/categoryProjectionContracts";

export function parseStoredCategoryProjection(
  value: unknown,
  lineItemId: number
): OrderCategoryProjection {
  if (value == null || typeof value !== "object") {
    throw new Error(`Missing category projection for line item ${lineItemId}`);
  }
  const row = value as Record<string, unknown>;
  const categoryId = row.categoryId;
  if (typeof categoryId !== "number" || !Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error(`Invalid category projection for line item ${lineItemId}`);
  }
  return Object.freeze({
    categoryId,
    categoryCode: String(row.categoryCode ?? `cat-${categoryId}`),
    categoryName: String(row.categoryName ?? ""),
    displayOrder: typeof row.displayOrder === "number" ? row.displayOrder : 0,
    parentCategoryId:
      row.parentCategoryId === null || typeof row.parentCategoryId === "number"
        ? (row.parentCategoryId as number | null)
        : null,
    version: typeof row.version === "number" ? row.version : 1,
    updatedAt: String(row.updatedAt ?? ""),
  });
}
