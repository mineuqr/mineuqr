/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — operational tax / grand-total math.
 * Applies frozen TaxPolicySnapshot only — never live Business Settings.
 * Not an accounting engine.
 */

import type {
  CheckTaxMode,
  TaxBreakdown,
  TaxBreakdownLine,
  TaxPolicySnapshot,
} from "./checkContract";

function roundMoney(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function parseMoney(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function parseRatePercent(ratePercent: string): number {
  const n = Number.parseFloat(ratePercent);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export type CheckMoneyInput = Readonly<{
  /**
   * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — sum of Bill-owned Charge.netAmount.
   * Prefer this over ordersSubtotal.
   */
  chargesSubtotal?: string;
  /**
   * Compatibility alias for chargesSubtotal.
   * Must not be populated from live Order.totalAmount after Charge cutover.
   */
  ordersSubtotal?: string;
  /** Bill-level discount only. */
  billDiscountAmount: string;
  taxPolicySnapshot: TaxPolicySnapshot;
}>;

export type CheckMoneyResult = Readonly<{
  subtotal: string;
  taxAmount: string;
  taxBreakdown: TaxBreakdown;
  grandTotal: string;
}>;

/**
 * Taxable base = max(0, ordersSubtotal - billDiscount).
 * Multi-component: each component applies independently to the same taxable base
 * (sum of component taxes). Compound stacking is not used.
 */
export function computeCheckMoney(input: CheckMoneyInput): CheckMoneyResult {
  const composition = input.chargesSubtotal ?? input.ordersSubtotal;
  if (composition == null) {
    throw new Error("computeCheckMoney requires chargesSubtotal");
  }
  const orders = parseMoney(composition);
  const discount = Math.max(0, parseMoney(input.billDiscountAmount));
  const taxableBase = Math.max(0, orders - discount);
  const subtotal = roundMoney(taxableBase);

  const policy = input.taxPolicySnapshot;
  if (!policy.enabled || policy.components.length === 0) {
    return {
      subtotal,
      taxAmount: "0.00",
      taxBreakdown: { lines: [], totalTaxAmount: "0.00" },
      grandTotal: subtotal,
    };
  }

  const mode: CheckTaxMode = policy.mode;
  const lines: TaxBreakdownLine[] = [];
  let totalTax = 0;

  for (const component of policy.components) {
    const rate = parseRatePercent(component.ratePercent) / 100;
    let amount = 0;
    if (rate <= 0) {
      amount = 0;
    } else if (mode === "exclusive") {
      amount = taxableBase * rate;
    } else {
      // Inclusive: extract tax portion from taxable base.
      amount = taxableBase - taxableBase / (1 + rate);
    }
    const amountStr = roundMoney(amount);
    totalTax += parseMoney(amountStr);
    lines.push({
      componentId: component.id,
      name: component.name,
      ratePercent: component.ratePercent,
      amount: amountStr,
    });
  }

  const taxAmount = roundMoney(totalTax);
  const grandTotal =
    mode === "exclusive"
      ? roundMoney(taxableBase + parseMoney(taxAmount))
      : subtotal;

  return {
    subtotal,
    taxAmount,
    taxBreakdown: { lines, totalTaxAmount: taxAmount },
    grandTotal,
  };
}
