/**
 * CASHIER-PAYMENT-FLOW-UX-CORRECTION-1
 * Display-only ticket money. Reuses computeCheckMoney with the restaurant's
 * live tax policy shaped as a snapshot. Not Check / Bill authority.
 */

import {
  businessTaxSettingsFromRestaurantRow,
  captureTaxPolicySnapshot,
  computeCheckMoney,
  type CheckMoneyResult,
  type TaxPolicySnapshot,
} from "@shared/operational-session";

function parseCents(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  if (!Number.isSafeInteger(whole)) return null;
  return whole * 100 + Number(frac);
}

function fromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function cashierDisplayTaxPolicy(input: {
  taxEnabled?: boolean | null;
  taxMode?: string | null;
  taxPolicyJson?: string | null;
}): TaxPolicySnapshot {
  const settings = businessTaxSettingsFromRestaurantRow({
    currencyCode: "SAR",
    currencySymbol: "ر.س",
    taxEnabled: input.taxEnabled,
    taxMode: input.taxMode,
    taxPolicyJson: input.taxPolicyJson,
  });
  return captureTaxPolicySnapshot(settings);
}

export function clampCashierDiscountAmount(
  discount: string,
  catalogSubtotal: string | null
): string {
  const discountCents = parseCents(discount);
  if (discountCents == null || discountCents < 0) return "0.00";
  if (catalogSubtotal == null) return fromCents(discountCents);
  const subtotalCents = parseCents(catalogSubtotal);
  if (subtotalCents == null) return fromCents(discountCents);
  return fromCents(Math.min(discountCents, subtotalCents));
}

export function displayCashierTicketMoney(input: {
  catalogSubtotal: string | null;
  billDiscountAmount: string;
  taxPolicySnapshot: TaxPolicySnapshot;
}): CheckMoneyResult | null {
  if (input.catalogSubtotal == null) return null;
  return computeCheckMoney({
    chargesSubtotal: input.catalogSubtotal,
    billDiscountAmount: input.billDiscountAmount,
    taxPolicySnapshot: input.taxPolicySnapshot,
  });
}
