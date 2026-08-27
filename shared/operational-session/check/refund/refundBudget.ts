/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 / REFUND-CF-ANCHOR-1
 *
 * RefundableBudget(scope) =
 *   OriginalCollectedValue(scope) − Sum(AppliedRefunds(scope))
 *
 * CF-backed: OriginalCollectedValue = production Collection Fact.amount
 * Legacy: OriginalCollectedValue = gen=1 paid|complimentary Settlement Record
 * Applied refunds remain the existing refund SR chain (RF-BUDGET-02 history).
 */

import type { SettlementRecord } from "../settlementRecord/settlementRecordContract";
import type { RefundBudget } from "./refundContract";
import {
  NoPriorSettlementError,
  RefundBudgetNegativeError,
} from "./refundErrors";
import type { RefundOriginalSaleAnchor } from "./refundOriginalSaleAnchor";
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
 * Calculate refundable budget.
 * Original collected amount is CF when a production Collection Fact anchor is supplied.
 * Gen=1 SR is not the original Cashier sale SSOT in that path.
 */
export function calculateRefundBudget(input: {
  restaurantId: number;
  checkId: number;
  settlementRecords: readonly SettlementRecord[];
  originalSale?: RefundOriginalSaleAnchor;
}): RefundBudget {
  const scoped = input.settlementRecords.filter(
    (r) =>
      r.restaurantId === input.restaurantId && r.checkId === input.checkId
  );

  const primary = scoped
    .filter(isPrimarySettlementPublication)
    .sort((a, b) => a.recordGeneration - b.recordGeneration)[0];

  const originalSale = input.originalSale;
  const cfBacked = originalSale?.kind === "collection_fact";
  if (!cfBacked && !primary) {
    throw new NoPriorSettlementError(
      `RF-INV-L01: No paid|complimentary Settlement Record for check=${input.checkId}`
    );
  }

  const settledValue =
    originalSale?.kind === "collection_fact"
      ? formatRefundMoney(parseRefundMoney(originalSale.originalCollectedAmount))
      : formatRefundMoney(parseRefundMoney(primary!.grandTotal));

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
    priorSettlementRecordId: primary?.settlementRecordId ?? "",
    nextRecordGeneration: maxGeneration + 1,
    originalSaleKind:
      originalSale?.kind === "collection_fact"
        ? "collection_fact"
        : "legacy_settlement_record",
    collectionFactId:
      originalSale?.kind === "collection_fact"
        ? originalSale.collectionFactId
        : null,
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
