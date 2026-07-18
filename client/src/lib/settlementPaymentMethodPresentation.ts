/**
 * SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — presentation helpers for tender capture.
 * Catalog from operational-session; labels from Product Semantics (no duplicates).
 */

import {
  MONETARY_PAYMENT_METHODS,
  type MonetaryPaymentMethod,
  type StaffSettlementLineInput,
} from "@shared/operational-session";
import {
  preferredPaymentMethodLabel,
  type PresentationLanguage,
} from "@shared/reporting-platform";

export type MonetaryPaymentMethodOption = Readonly<{
  paymentMethod: MonetaryPaymentMethod;
  label: string;
}>;

export function listMonetaryPaymentMethodOptions(
  language: PresentationLanguage
): readonly MonetaryPaymentMethodOption[] {
  return MONETARY_PAYMENT_METHODS.map((paymentMethod) => ({
    paymentMethod,
    label: preferredPaymentMethodLabel(paymentMethod, language),
  }));
}

/** Single tender covering full Check grandTotal (amount filled by domain). */
export function singleTenderSettlements(
  paymentMethod: MonetaryPaymentMethod
): readonly StaffSettlementLineInput[] {
  return [{ paymentMethod }];
}
