/**
 * CHECK-SETTLEMENT-METHODS-1 — canonical Payment Method catalog.
 *
 * Extensible: new methods are additive string codes.
 * Gateway integrations are out of scope.
 */

export const CHECK_SETTLEMENT_METHODS_PROGRAM_ID =
  "CHECK-SETTLEMENT-METHODS-1" as const;

/**
 * Built-in payment methods. Custom restaurant codes may be added later
 * without redesign — persist as lowercase snake / short codes.
 */
export const PAYMENT_METHODS = [
  "cash",
  "mada",
  "visa",
  "mastercard",
  "apple_pay",
  "stc_pay",
  "bank_transfer",
  "complimentary",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Methods that settle real money (not complimentary). */
export const MONETARY_PAYMENT_METHODS = [
  "cash",
  "mada",
  "visa",
  "mastercard",
  "apple_pay",
  "stc_pay",
  "bank_transfer",
  "other",
] as const satisfies readonly PaymentMethod[];

export type MonetaryPaymentMethod = (typeof MONETARY_PAYMENT_METHODS)[number];

/**
 * Default tender when staff settle paid without specifying a method.
 * SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — Mark Paid UI supplies tenders;
 * this remains the legacy fallback when settlements[] is omitted.
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

export function isMonetaryPaymentMethod(
  value: PaymentMethod
): value is MonetaryPaymentMethod {
  return (MONETARY_PAYMENT_METHODS as readonly string[]).includes(value);
}

/** Payment method category for future reporting rollups. */
export type PaymentMethodCategory =
  | "cash"
  | "card"
  | "digital_wallet"
  | "bank"
  | "complimentary"
  | "other";

export function paymentMethodCategory(
  method: PaymentMethod
): PaymentMethodCategory {
  switch (method) {
    case "cash":
      return "cash";
    case "mada":
    case "visa":
    case "mastercard":
      return "card";
    case "apple_pay":
    case "stc_pay":
      return "digital_wallet";
    case "bank_transfer":
      return "bank";
    case "complimentary":
      return "complimentary";
    case "other":
    default:
      return "other";
  }
}
