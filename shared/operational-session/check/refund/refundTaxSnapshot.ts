/**
 * REFUND-DOWNSTREAM-FIDELITY-AND-CUSTODY-HARDENING-1 — Phase 2
 * Refund reverse money snapshot with proportional tax from original sale.
 * Does not recalculate tax policy. Copies proportional share of frozen tax.
 */

import {
  formatRefundMoney,
  parseRefundMoney,
  refundMoneyEquals,
} from "./refundMoney";

export type RefundOriginalTaxBasis = Readonly<{
  grandTotal: string;
  subtotal: string;
  taxAmount: string;
  taxBreakdown: Readonly<{
    totalTaxAmount: string;
    lines: readonly Readonly<{
      componentId: string;
      name: string;
      ratePercent: string;
      amount: string;
    }>[];
  }>;
}>;

function toCents(value: string): number {
  return Math.round(parseRefundMoney(value) * 100);
}

function fromCents(cents: number): string {
  return formatRefundMoney(Math.max(0, cents) / 100);
}

/**
 * Build Check-decided reverse money snapshot for a refund amount.
 * When original tax basis is present, allocate tax proportionally to refund/grandTotal.
 * Exclusive model: subtotal = refund − tax (floored at 0).
 */
export function buildRefundReverseSnapshot(
  amount: string,
  original?: RefundOriginalTaxBasis | null
): {
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  taxBreakdown: {
    totalTaxAmount: string;
    lines: readonly Readonly<{
      componentId: string;
      name: string;
      ratePercent: string;
      amount: string;
    }>[];
  };
} {
  const grandTotal = formatRefundMoney(parseRefundMoney(amount));
  if (!original) {
    return {
      subtotal: grandTotal,
      discountAmount: "0.00",
      taxAmount: "0.00",
      grandTotal,
      taxBreakdown: {
        totalTaxAmount: "0.00",
        lines: [],
      },
    };
  }

  const originalGrandCents = toCents(original.grandTotal);
  const refundCents = toCents(grandTotal);
  if (originalGrandCents <= 0 || refundCents <= 0) {
    return {
      subtotal: grandTotal,
      discountAmount: "0.00",
      taxAmount: "0.00",
      grandTotal,
      taxBreakdown: {
        totalTaxAmount: "0.00",
        lines: [],
      },
    };
  }

  // Full refund: mirror original tax composition exactly.
  if (refundCents === originalGrandCents) {
    return {
      subtotal: formatRefundMoney(parseRefundMoney(original.subtotal)),
      discountAmount: "0.00",
      taxAmount: formatRefundMoney(parseRefundMoney(original.taxAmount)),
      grandTotal,
      taxBreakdown: {
        totalTaxAmount: formatRefundMoney(
          parseRefundMoney(original.taxBreakdown.totalTaxAmount)
        ),
        lines: original.taxBreakdown.lines.map((line) => ({
          componentId: line.componentId,
          name: line.name,
          ratePercent: line.ratePercent,
          amount: formatRefundMoney(parseRefundMoney(line.amount)),
        })),
      },
    };
  }

  const originalTaxCents = toCents(original.taxAmount);
  let taxCents = Math.floor((refundCents * originalTaxCents) / originalGrandCents);
  if (taxCents > refundCents) taxCents = refundCents;
  const subtotalCents = refundCents - taxCents;

  const lines = original.taxBreakdown.lines.map((line) => {
    const lineCents = toCents(line.amount);
    const allocated = Math.floor(
      (refundCents * lineCents) / originalGrandCents
    );
    return {
      componentId: line.componentId,
      name: line.name,
      ratePercent: line.ratePercent,
      amount: fromCents(allocated),
      _cents: allocated,
    };
  });
  let lineSum = lines.reduce((s, l) => s + l._cents, 0);
  if (lines.length > 0 && lineSum !== taxCents) {
    const last = lines[lines.length - 1]!;
    last._cents += taxCents - lineSum;
    last.amount = fromCents(last._cents);
    lineSum = taxCents;
  }

  const taxAmount = fromCents(taxCents);
  return {
    subtotal: fromCents(subtotalCents),
    discountAmount: "0.00",
    taxAmount,
    grandTotal,
    taxBreakdown: {
      totalTaxAmount: taxAmount,
      lines: lines.map(({ componentId, name, ratePercent, amount }) => ({
        componentId,
        name,
        ratePercent,
        amount,
      })),
    },
  };
}

export function assertReverseSnapshotCoherent(snapshot: {
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
}): void {
  const sum = formatRefundMoney(
    parseRefundMoney(snapshot.subtotal) + parseRefundMoney(snapshot.taxAmount)
  );
  if (!refundMoneyEquals(sum, snapshot.grandTotal)) {
    // Exclusive composition may leave rounding on grandTotal authority.
    // grandTotal remains the refund amount; subtotal+tax must not exceed it.
    const over =
      parseRefundMoney(snapshot.subtotal) + parseRefundMoney(snapshot.taxAmount);
    if (over > parseRefundMoney(snapshot.grandTotal) + 0.001) {
      throw new Error(
        `RF-TAX-01: reverse snapshot subtotal+tax ${sum} exceeds grandTotal ${snapshot.grandTotal}`
      );
    }
  }
}
