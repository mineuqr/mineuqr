/**
 * CHECK-SETTLEMENT-METHODS-1 /
 * PAYMENT-METHOD-CATALOG-UNIFICATION-1 — canonical Payment Method catalog.
 *
 * Selectable/write keys: cash | card | other
 * Legacy codes (mada, visa, …) remain valid for historical reads and map to card.
 * Gateway brand detail is not a separate settle selection.
 */

export const CHECK_SETTLEMENT_METHODS_PROGRAM_ID =
  "CHECK-SETTLEMENT-METHODS-1" as const;

export const PAYMENT_METHOD_CATALOG_UNIFICATION_PROGRAM_ID =
  "PAYMENT-METHOD-CATALOG-UNIFICATION-1" as const;

/** Canonical monetary keys — the single Payment Method catalog. */
export const CANONICAL_MONETARY_PAYMENT_METHODS = [
  "cash",
  "card",
  "other",
] as const;

export type CanonicalMonetaryPaymentMethod =
  (typeof CANONICAL_MONETARY_PAYMENT_METHODS)[number];

/**
 * UI selection list — `other` supported in catalog but hidden until needed.
 */
export const SELECTABLE_PAYMENT_METHODS = ["cash", "card"] as const;

export type SelectablePaymentMethod =
  (typeof SELECTABLE_PAYMENT_METHODS)[number];

/** Historical electronic methods — map to canonical `card` for display/analytics. */
export const LEGACY_CARD_PAYMENT_METHODS = [
  "mada",
  "visa",
  "mastercard",
  "apple_pay",
  "stc_pay",
  "bank_transfer",
] as const;

/**
 * Catalog alias used by reporting presentation expansion.
 * Equals the canonical monetary set (no duplicated brand lists).
 */
export const MONETARY_PAYMENT_METHODS = CANONICAL_MONETARY_PAYMENT_METHODS;

export type MonetaryPaymentMethod =
  (typeof MONETARY_PAYMENT_METHODS)[number];

/**
 * All known payment method codes (canonical + legacy + complimentary).
 * Persistence accepts these; new staff settle UIs write only selectable keys.
 */
export const PAYMENT_METHODS = [
  "cash",
  "card",
  "other",
  ...LEGACY_CARD_PAYMENT_METHODS,
  "complimentary",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Methods accepted on staff settle lines (canonical + legacy for API compat).
 * Not a second catalog — legacy is accepted input that maps to `card`.
 */
export const ACCEPTED_SETTLEMENT_PAYMENT_METHODS = [
  ...CANONICAL_MONETARY_PAYMENT_METHODS,
  ...LEGACY_CARD_PAYMENT_METHODS,
] as const;

export type AcceptedSettlementPaymentMethod =
  (typeof ACCEPTED_SETTLEMENT_PAYMENT_METHODS)[number];

/**
 * Default tender when staff settle paid without specifying a method.
 * Unchanged for financial compatibility (omit → "other").
 */
export const DEFAULT_PAID_PAYMENT_METHOD: PaymentMethod = "other";

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function assertPaymentMethod(value: string): PaymentMethod {
  if (!isPaymentMethod(value)) {
    throw new Error(`Invalid payment method: ${value}`);
  }
  return value;
}

export function isMonetaryPaymentMethod(value: string): boolean {
  return (ACCEPTED_SETTLEMENT_PAYMENT_METHODS as readonly string[]).includes(
    value
  );
}

export function isLegacyCardPaymentMethod(value: string): boolean {
  return (LEGACY_CARD_PAYMENT_METHODS as readonly string[]).includes(value);
}

/**
 * Map any stored method code to the canonical catalog key for display/analytics.
 * Does not mutate stored Settlement Records.
 */
export function toCanonicalPaymentMethod(
  method: string
): CanonicalMonetaryPaymentMethod | "complimentary" {
  const normalized = method.trim().toLowerCase();
  if (normalized === "cash") return "cash";
  if (normalized === "card") return "card";
  if (normalized === "other") return "other";
  if (normalized === "complimentary") return "complimentary";
  if (isLegacyCardPaymentMethod(normalized)) return "card";
  return "other";
}

/** Payment method category for reporting rollups (canonical catalog). */
export type PaymentMethodCategory =
  | "cash"
  | "card"
  | "complimentary"
  | "other";

export function paymentMethodCategory(
  method: string
): PaymentMethodCategory {
  const canonical = toCanonicalPaymentMethod(method);
  if (canonical === "complimentary") return "complimentary";
  return canonical;
}
