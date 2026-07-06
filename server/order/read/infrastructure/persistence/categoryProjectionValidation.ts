import {
  ORDER_CATEGORY_PROJECTION_SCHEMA_VERSION,
  type OrderCategoryProjection,
} from "../../domain/contracts/categoryProjectionContracts";
import { parseStoredCategoryProjection } from "./parseStoredCategoryProjection";

export type CategoryProjectionValidationResult =
  | { valid: true; projection: OrderCategoryProjection }
  | { valid: false; reason: string };

/** Whether a stored JSON value is a canonical category projection. */
export function validateStoredCategoryProjection(
  value: unknown,
  lineItemId: number
): CategoryProjectionValidationResult {
  if (value == null) {
    return { valid: false, reason: "null_projection" };
  }
  try {
    const projection = parseStoredCategoryProjection(value, lineItemId);
    if (!Number.isInteger(projection.categoryId) || projection.categoryId <= 0) {
      return { valid: false, reason: "invalid_category_id" };
    }
    if (projection.categoryCode !== `cat-${projection.categoryId}`) {
      return { valid: false, reason: "invalid_category_code" };
    }
    if (!projection.categoryName.trim()) {
      return { valid: false, reason: "missing_category_name" };
    }
    if (!Number.isInteger(projection.version) || projection.version <= 0) {
      return { valid: false, reason: "invalid_projection_version" };
    }
    if (!projection.updatedAt.trim()) {
      return { valid: false, reason: "missing_updated_at" };
    }
    return { valid: true, projection };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : "parse_failed",
    };
  }
}

export function isUpgradedCategoryProjection(value: unknown, lineItemId: number): boolean {
  return validateStoredCategoryProjection(value, lineItemId).valid;
}

export function assertCanonicalCategoryProjection(
  projection: OrderCategoryProjection,
  lineItemId: number
): void {
  const check = validateStoredCategoryProjection(projection, lineItemId);
  if (!check.valid) {
    throw new Error(`Built projection failed validation for line item ${lineItemId}: ${check.reason}`);
  }
}

export function expectedCategoryProjectionSchemaVersion(): number {
  return ORDER_CATEGORY_PROJECTION_SCHEMA_VERSION;
}
