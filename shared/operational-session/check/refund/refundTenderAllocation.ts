/**
 * REFUND-DOWNSTREAM-FIDELITY-AND-CUSTODY-HARDENING-1 — Phase 1
 * Allocate refund paymentSnapshot across original sale tenders.
 * Full refund mirrors original tender amounts; partial uses largest-remainder.
 * Does not invent tenders. Does not mutate Collection Fact.
 */

import {
  formatRefundMoney,
  parseRefundMoney,
  refundMoneyEquals,
} from "./refundMoney";

export type RefundTenderLine = Readonly<{
  paymentMethod: string;
  amount: string;
}>;

function toCents(value: string): number {
  return Math.round(parseRefundMoney(value) * 100);
}

function fromCents(cents: number): string {
  return formatRefundMoney(cents / 100);
}

/**
 * Allocate refundAmount across original tenders.
 * When refundAmount equals original total, mirror amounts exactly.
 * Otherwise proportional largest-remainder so lines sum to refundAmount.
 */
export function allocateRefundAcrossTenders(input: {
  refundAmount: string;
  originalTenders: readonly RefundTenderLine[];
}): readonly RefundTenderLine[] {
  const refundAmount = formatRefundMoney(parseRefundMoney(input.refundAmount));
  const positive = input.originalTenders.filter(
    (t) => parseRefundMoney(t.amount) > 0 && String(t.paymentMethod).trim()
  );
  if (positive.length === 0) {
    return [{ paymentMethod: "other", amount: refundAmount }];
  }

  const originalTotalCents = positive.reduce(
    (sum, t) => sum + toCents(t.amount),
    0
  );
  if (originalTotalCents <= 0) {
    return [{ paymentMethod: "other", amount: refundAmount }];
  }

  const refundCents = toCents(refundAmount);
  if (refundCents === originalTotalCents) {
    return positive.map((t) => ({
      paymentMethod: String(t.paymentMethod).trim(),
      amount: formatRefundMoney(parseRefundMoney(t.amount)),
    }));
  }

  const shares = positive.map((t) => {
    const tenderCents = toCents(t.amount);
    const exact = (refundCents * tenderCents) / originalTotalCents;
    const floor = Math.floor(exact);
    return {
      paymentMethod: String(t.paymentMethod).trim(),
      floor,
      frac: exact - floor,
    };
  });
  let remaining = refundCents - shares.reduce((s, x) => s + x.floor, 0);
  const ranked = shares
    .map((s, index) => ({ index, frac: s.frac }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  const allocated = shares.map((s) => s.floor);
  for (const row of ranked) {
    if (remaining <= 0) break;
    allocated[row.index]! += 1;
    remaining -= 1;
  }

  const lines: RefundTenderLine[] = [];
  for (let i = 0; i < positive.length; i += 1) {
    const cents = allocated[i]!;
    if (cents <= 0) continue;
    lines.push({
      paymentMethod: shares[i]!.paymentMethod,
      amount: fromCents(cents),
    });
  }
  if (lines.length === 0) {
    return [{ paymentMethod: "other", amount: refundAmount }];
  }

  const sum = lines.reduce((s, l) => s + toCents(l.amount), 0);
  if (sum !== refundCents && lines.length > 0) {
    const last = lines[lines.length - 1]!;
    lines[lines.length - 1] = {
      paymentMethod: last.paymentMethod,
      amount: fromCents(toCents(last.amount) + (refundCents - sum)),
    };
  }
  return lines;
}

/**
 * Build refund paymentSnapshot lines.
 * Prefer original-sale tenders (CF / legacy SR) for fidelity.
 * Fall back to explicit tenderMethod only when no original tender facts exist.
 */
export function buildRefundPaymentSnapshotLines(input: {
  refundAmount: string;
  originalTenders: readonly RefundTenderLine[];
  explicitTenderMethod?: string | null;
  currencyCode: string;
  businessTimestamp: string;
  reference: string | null;
}): readonly Readonly<{
  settlementTransactionId: null;
  paymentMethod: string;
  amount: string;
  currencyCode: string;
  status: "refunded";
  businessTimestamp: string;
  reference: string | null;
  externalReference: null;
}>[] {
  const hasOriginal = input.originalTenders.some(
    (t) => parseRefundMoney(t.amount) > 0
  );
  const lines = hasOriginal
    ? allocateRefundAcrossTenders({
        refundAmount: input.refundAmount,
        originalTenders: input.originalTenders,
      })
    : [
        {
          paymentMethod:
            String(input.explicitTenderMethod ?? "other").trim() || "other",
          amount: formatRefundMoney(parseRefundMoney(input.refundAmount)),
        },
      ];

  return lines.map((line) => ({
    settlementTransactionId: null,
    paymentMethod: line.paymentMethod,
    amount: line.amount,
    currencyCode: input.currencyCode,
    status: "refunded" as const,
    businessTimestamp: input.businessTimestamp,
    reference: input.reference,
    externalReference: null,
  }));
}

export function assertRefundTenderAllocationSums(
  refundAmount: string,
  lines: readonly RefundTenderLine[]
): void {
  const sum = lines.reduce((s, l) => s + parseRefundMoney(l.amount), 0);
  if (!refundMoneyEquals(formatRefundMoney(sum), refundAmount)) {
    throw new Error(
      `RF-TENDER-01: tender allocation ${formatRefundMoney(sum)} != refund ${refundAmount}`
    );
  }
}
