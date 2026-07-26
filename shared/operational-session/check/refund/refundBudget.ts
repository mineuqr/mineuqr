/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — Refund Budget Law.
 *
 * RefundableBudget(scope) =
 *   SettledCollectibleValue(scope) − Sum(AppliedRefunds(scope))
 *
 * Derived from immutable Settlement Record history only (RF-BUDGET-02).
 */

import type { SettlementRecord } from "../settlementRecord/settlementRecordContract";
import type { RefundBudget } from "./refundContract";
import {
  NoPriorSettlementError,
  RefundBudgetNegativeError,
} from "./refundErrors";
import {
  formatRefundMoney,
  parseRefundMoney,
  refundMoneyAdd,
  refundMoneySub,
} from "./refundMoney";

function isPrimarySettlementPublication(record: SettlementRecord): boolean {
  return (
    record.recordKind === "settlement" &&
    (record.outcome === "paid" || record.outcome === "complimentary")
  );
}

/**
 * Calculate refundable budget from append-only Settlement Record history.
 */
export function calculateRefundBudget(input: {
  restaurantId: number;
  checkId: number;
  settlementRecords: readonly SettlementRecord[];
}): RefundBudget {
  const scoped = input.settlementRecords.filter(
    (r) =>
      r.restaurantId === input.restaurantId && r.checkId === input.checkId
  );

  const primary = scoped
    .filter(isPrimarySettlementPublication)
    .sort((a, b) => a.recordGeneration - b.recordGeneration)[0];

  if (!primary) {
    throw new NoPriorSettlementError(
      `RF-INV-L01: No paid|complimentary Settlement Record for check=${input.checkId}`
    );
  }

  const settledValue = formatRefundMoney(parseRefundMoney(primary.grandTotal));

  let appliedRefundTotal = "0.00";
  for (const record of scoped) {
    if (record.recordKind !== "refund") continue;
    appliedRefundTotal = refundMoneyAdd(appliedRefundTotal, record.grandTotal);
  }

  let refundableBalance: string;
  try {
    refundableBalance = refundMoneySub(settledValue, appliedRefundTotal);
  } catch (error) {
    if (error instanceof RefundBudgetNegativeError) {
      throw new RefundBudgetNegativeError(
        `RF-BUDGET-05: applied refunds ${appliedRefundTotal} exceed settled value ${settledValue}`
      );
    }
    throw error;
  }

  const maxGeneration = scoped.reduce(
    (max, r) => Math.max(max, r.recordGeneration),
    0
  );

  return {
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    settledValue,
    appliedRefundTotal,
    refundableBalance,
    priorSettlementRecordId: primary.settlementRecordId,
    nextRecordGeneration: maxGeneration + 1,
  };
}

/**
 * Build Check-decided reverse money snapshot for a refund amount.
 * Values are supplied to Settlement Record as copy source — SR does not calculate.
 */
export function buildRefundReverseSnapshot(amount: string): {
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  taxBreakdown: {
    totalTaxAmount: string;
    lines: readonly never[];
  };
} {
  const grandTotal = formatRefundMoney(parseRefundMoney(amount));
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
