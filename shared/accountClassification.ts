/**
 * ADMIN-AUTH-1B — canonical account classification (single definition).
 * Independent from authorization role and commercial subscription state.
 */

export const ACCOUNT_CLASSIFICATIONS = [
  "COMMERCIAL",
  "INTERNAL",
  "SYSTEM",
] as const;

export type AccountClassification = (typeof ACCOUNT_CLASSIFICATIONS)[number];

export const DEFAULT_ACCOUNT_CLASSIFICATION: AccountClassification = "COMMERCIAL";

export const INTERNAL_STAFF_CATEGORIES = [
  "marketing",
  "sales",
  "support",
  "operations",
] as const;

export type InternalStaffCategory = (typeof INTERNAL_STAFF_CATEGORIES)[number];

export function isAccountClassification(value: string): value is AccountClassification {
  return (ACCOUNT_CLASSIFICATIONS as readonly string[]).includes(value);
}

export function isInternalStaffCategory(value: string): value is InternalStaffCategory {
  return (INTERNAL_STAFF_CATEGORIES as readonly string[]).includes(value);
}

/** ADMIN-AUTH-1A — SYSTEM accounts must not hold human admin role. */
export function isForbiddenSystemAdminCombo(
  role: "user" | "admin",
  classification: AccountClassification
): boolean {
  return role === "admin" && classification === "SYSTEM";
}
