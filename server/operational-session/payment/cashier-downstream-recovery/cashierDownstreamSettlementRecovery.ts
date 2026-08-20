/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1
 * Operational recovery for ST / OS / SR after Collection Fact commit.
 * Not a financial authority. Never writes Collection Fact.
 */

import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import { formatDiningSessionTimestamp } from "../../../diningSession/sessionTypes";
import { findCheckById } from "../../check/checkRepository";
import { mapRowToOperationalCheck } from "../../check/checkMapper";
import {
  insertSettlementTransactions,
  listSettlementTransactionsForCheck,
} from "../../check/settlementTransactionRepository";
import { listOrderSettlementsForCheck } from "../../check/orderSettlementRepository";
import { listSettlementRecordsForCheck } from "../../check/settlementRecordRepository";
import { applyFullSettlementToCheckOrders } from "../../check/checkOrderSettlementIntegration";
import { createSettlementRecordForCheckFinalize } from "../../check/checkSettlementRecordIntegration";
import { findProductionCollectionFactByCheckId } from "../collection-fact/collectionFactRepository";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import type { SettlementContext, SettlementContextHints } from "@shared/crmp";

export const CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID =
  "CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1" as const;

export type CashierDownstreamRecoveryState =
  | "pending"
  | "processing"
  | "completed"
  | "retryable_failure"
  | "failed_requires_attention";

export type CashierDownstreamComponentState = Readonly<{
  checkPaid: boolean;
  st: boolean;
  os: boolean;
  sr: boolean;
}>;

export type CashierDownstreamSettlementInspection = Readonly<{
  recoveryId: string | null;
  restaurantId: number;
  paymentIntentId: string | null;
  collectionFactId: string | null;
  orderId: number | null;
  checkId: number;
  checkOutcome: string;
  state: CashierDownstreamRecoveryState;
  components: CashierDownstreamComponentState;
}>;

export function deriveCashierDownstreamRecoveryState(
  checkOutcome: string,
  components: CashierDownstreamComponentState
): CashierDownstreamRecoveryState {
  if (checkOutcome === "voided" || checkOutcome === "complimentary") {
    return "failed_requires_attention";
  }
  if (
    components.checkPaid &&
    components.st &&
    components.os &&
    components.sr
  ) {
    return "completed";
  }
  return "pending";
}

function osComplete(
  settlements: readonly { status: string }[]
): boolean {
  if (settlements.length === 0) return true;
  return settlements.every((row) => row.status === "settled");
}

export async function inspectCashierDownstreamSettlement(input: {
  restaurantId: number;
  checkId: number;
}): Promise<CashierDownstreamSettlementInspection> {
  const row = await findCheckById(input.checkId);
  const checkOutcome = row?.outcome ?? "missing";
  const st = await listSettlementTransactionsForCheck(input);
  const os = await listOrderSettlementsForCheck(input);
  const records = await listSettlementRecordsForCheck(input);
  const sr = records.filter((record) => record.recordKind === "settlement");
  const fact = await findProductionCollectionFactByCheckId(input);
  const components: CashierDownstreamComponentState = {
    checkPaid: checkOutcome === "paid",
    st: st.length > 0,
    os: osComplete(os),
    sr: sr.length > 0,
  };
  return {
    recoveryId: fact?.collectionFactId ?? null,
    restaurantId: input.restaurantId,
    paymentIntentId: fact?.paymentIntentId ?? null,
    collectionFactId: fact?.collectionFactId ?? null,
    orderId: fact?.orderId ?? null,
    checkId: input.checkId,
    checkOutcome,
    state: deriveCashierDownstreamRecoveryState(checkOutcome, components),
    components,
  };
}

export function tendersToSettlementLines(
  tenders: readonly { paymentMethod: string; amount: string }[]
): StaffSettlementLineInput[] {
  return tenders.map((tender) => ({
    paymentMethod: tender.paymentMethod as StaffSettlementLineInput["paymentMethod"],
    amount: tender.amount,
  }));
}

export async function settlementsFromProductionCollectionFact(input: {
  restaurantId: number;
  checkId: number;
}): Promise<StaffSettlementLineInput[] | undefined> {
  const fact = await findProductionCollectionFactByCheckId(input);
  if (!fact || fact.tenders.length === 0) return undefined;
  return tendersToSettlementLines(fact.tenders);
}

/**
 * Fill ST / OS / SR that are still missing after Check PAID.
 * Skips completed components. Does not commit Collection Fact.
 */
export async function ensureRemainingCashierDownstreamSettlement(input: {
  restaurantId: number;
  checkId: number;
  settlements?: readonly StaffSettlementLineInput[];
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
}): Promise<CashierDownstreamComponentState> {
  const before = await inspectCashierDownstreamSettlement(input);
  opsLog({
    type: OPS_EVENT.cashier_downstream_settlement_recovery,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId,
    action: "ensureRemainingCashierDownstreamSettlement",
    metadata: {
      program: CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
      recoveryId: before.recoveryId,
      paymentIntentId: before.paymentIntentId,
      collectionFactId: before.collectionFactId,
      orderId: before.orderId,
      checkId: input.checkId,
      state: "processing",
      attemptCount: null,
      components: before.components,
    },
  });

  if (before.checkOutcome !== "paid") {
    return before.components;
  }

  if (!before.components.st) {
    const settlements =
      input.settlements ??
      (await settlementsFromProductionCollectionFact(input));
    const row = await findCheckById(input.checkId);
    if (row && settlements && settlements.length > 0) {
      await insertSettlementTransactions({
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        sessionId: row.sessionId,
        currencyCode: mapRowToOperationalCheck(row).currencySnapshot.currencyCode,
        businessTimestamp: formatDiningSessionTimestamp(),
        lines: settlements.map((line) => ({
          paymentMethod: line.paymentMethod,
          amount: line.amount ?? row.grandTotal,
        })),
      });
    }
  }

  const afterSt = await inspectCashierDownstreamSettlement(input);
  if (!afterSt.components.os) {
    await applyFullSettlementToCheckOrders({
      restaurantId: input.restaurantId,
      checkId: input.checkId,
    });
  }

  const afterOs = await inspectCashierDownstreamSettlement(input);
  if (!afterOs.components.sr) {
    const row = await findCheckById(input.checkId);
    if (row) {
      const check = mapRowToOperationalCheck(row);
      const st = await listSettlementTransactionsForCheck(input);
      const os = await listOrderSettlementsForCheck(input);
      await createSettlementRecordForCheckFinalize({
        restaurantId: input.restaurantId,
        check,
        outcome: "paid",
        freeze: {
          subtotal: check.subtotal,
          billDiscountAmount: check.billDiscountAmount,
          taxAmount: check.taxAmount,
          taxBreakdown: check.taxBreakdown,
          grandTotal: check.grandTotal,
          settledAt: check.settledAt,
        },
        settlementLines:
          st.length > 0
            ? st.map((line) => ({
                paymentMethod: line.paymentMethod,
                amount: line.amount,
              }))
            : null,
        orderSettlements: os,
      });
    }
  }

  const done = await inspectCashierDownstreamSettlement(input);
  opsLog({
    type: OPS_EVENT.cashier_downstream_settlement_recovery,
    category: "ORDER",
    severity: done.state === "completed" ? "info" : "warn",
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId,
    action: "ensureRemainingCashierDownstreamSettlement",
    metadata: {
      program: CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
      recoveryId: done.recoveryId,
      paymentIntentId: done.paymentIntentId,
      collectionFactId: done.collectionFactId,
      orderId: done.orderId,
      checkId: input.checkId,
      state: done.state,
      components: done.components,
    },
  });
  return done.components;
}
