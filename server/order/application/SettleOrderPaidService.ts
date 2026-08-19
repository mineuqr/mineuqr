/**
 * SELF-ORDERING-SETTLEMENT-ADOPTION-1 — Order → Check settle façade.
 * PAYMENT-CONFIRM-REMAINING-CALLERS-1 — Confirm Payment enters confirmPayment.
 *
 * Resolves the Check for an Order and reuses the certified Check settle pipeline
 * via confirmPayment (Settlement Record included).
 *
 * No parallel payment model. No duplicate Settlement Record writer.
 * Order Settlement remains operational publication/correlation, not Payment owner.
 */

import { getOrderById } from "../../db";
import {
  CheckTransitionError,
  ensureCheckForOrder,
  findBlockingMembershipForOrder,
} from "../../operational-session/check";
import { confirmPayment } from "../../operational-session/payment/PaymentConfirmService";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import type { SettlementContext, SettlementContextHints } from "@shared/crmp";
import { unavailableSettlementContext } from "@shared/crmp";
import { listSettlementRecordsForCheck } from "../../operational-session/check/settlementRecordRepository";
import { getOrderSettlementProjectionStore } from "../../operational-session/check/api/orderSettlementReadComposition";
import { tryMaterializeOrderSettlementProjections } from "../../operational-session/check/read/orderSettlementProjectionMaterializer";

export class SettleOrderPaidError extends Error {
  readonly code:
    | "ORDER_NOT_FOUND"
    | "TRACKING_MISMATCH"
    | "CHECK_NOT_FOUND"
    | "CHECK_NOT_SETTLEABLE"
    | "SETTLEMENT_RECORD_MISSING";

  constructor(
    code: SettleOrderPaidError["code"],
    message: string
  ) {
    super(message);
    this.name = "SettleOrderPaidError";
    this.code = code;
  }
}

export type SettleOrderPaidResult = Readonly<{
  orderId: number;
  checkId: number;
  settlementRecordId: string;
  settlementNumber: string;
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  paymentMethodSummary: string;
  alreadySettled: boolean;
  /** SETTLEMENT-CONTEXT-ADOPTION-1 — operational context (fail-open). */
  settlementContext: SettlementContext;
}>;

function newestSettlementRecordId(
  records: Awaited<ReturnType<typeof listSettlementRecordsForCheck>>
): string | null {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => {
    const ta = Date.parse(a.settledAt ?? a.createdAt);
    const tb = Date.parse(b.settledAt ?? b.createdAt);
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
  return sorted[0]?.settlementRecordId ?? null;
}

function paymentSummaryFromRecord(
  record: NonNullable<
    Awaited<ReturnType<typeof listSettlementRecordsForCheck>>[number]
  >
): string {
  const methods = record.paymentSnapshot.map((p) => String(p.paymentMethod));
  if (methods.length === 0) return "none";
  return Array.from(new Set(methods)).join(", ");
}

/**
 * Settle the Order's open Check as paid through the Payment Confirm process.
 * Idempotent when Check is already paid — returns existing Settlement Record.
 */
export async function settleOrderPaid(input: {
  restaurantId: number;
  orderId: number;
  trackingToken: string;
  settlements?: readonly StaffSettlementLineInput[];
  /** SETTLEMENT-CONTEXT-ADOPTION-1 — optional station hints (fail-open). */
  registerId?: string | null;
  deviceId?: string | null;
  operatorUserId?: number | null;
  operationalScreenId?: string | null;
}): Promise<SettleOrderPaidResult> {
  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new SettleOrderPaidError("ORDER_NOT_FOUND", "Order not found");
  }
  if (
    !order.trackingToken ||
    order.trackingToken !== input.trackingToken
  ) {
    throw new SettleOrderPaidError(
      "TRACKING_MISMATCH",
      "Order tracking token mismatch"
    );
  }

  const settlementContextHints: SettlementContextHints = {
    registerId: input.registerId,
    deviceId: input.deviceId,
    operatorUserId: input.operatorUserId,
    operationalScreenId: input.operationalScreenId,
  };
  const unavailableCtx = () =>
    unavailableSettlementContext(
      input.restaurantId,
      new Date().toISOString(),
      ["already_settled_no_live_context"]
    );

  let membership = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId
  );

  if (!membership) {
    await ensureCheckForOrder({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
    });
    membership = await findBlockingMembershipForOrder(
      input.restaurantId,
      input.orderId
    );
  }

  if (!membership) {
    throw new SettleOrderPaidError(
      "CHECK_NOT_FOUND",
      "No Check enrolled for Order"
    );
  }

  const checkId = membership.membership.checkId;

  if (membership.checkOutcome === "paid") {
    const records = await listSettlementRecordsForCheck({
      restaurantId: input.restaurantId,
      checkId,
    });
    const settlementRecordId = newestSettlementRecordId(records);
    if (!settlementRecordId) {
      throw new SettleOrderPaidError(
        "SETTLEMENT_RECORD_MISSING",
        "Paid Check has no Settlement Record"
      );
    }
    const record = records.find(
      (r) => r.settlementRecordId === settlementRecordId
    )!;
    return {
      orderId: input.orderId,
      checkId,
      settlementRecordId,
      settlementNumber: settlementRecordId,
      grandTotal: String(record.grandTotal),
      currencyCode: record.currencySnapshot.currencyCode,
      currencySymbol: record.currencySnapshot.currencySymbol,
      paymentMethodSummary: paymentSummaryFromRecord(record),
      alreadySettled: true,
      settlementContext: unavailableCtx(),
    };
  }

  if (membership.checkOutcome !== "open") {
    throw new SettleOrderPaidError(
      "CHECK_NOT_SETTLEABLE",
      `Check outcome ${membership.checkOutcome} cannot be settled paid`
    );
  }

  let financial;
  try {
    financial = await confirmPayment({
      restaurantId: input.restaurantId,
      checkId,
      settlements: input.settlements,
      settlementContextHints,
    });
  } catch (err) {
    if (err instanceof CheckTransitionError) {
      // Race: another settle won — return existing SR if paid.
      const records = await listSettlementRecordsForCheck({
        restaurantId: input.restaurantId,
        checkId,
      });
      const settlementRecordId = newestSettlementRecordId(records);
      if (settlementRecordId) {
        const record = records.find(
          (r) => r.settlementRecordId === settlementRecordId
        )!;
        return {
          orderId: input.orderId,
          checkId,
          settlementRecordId,
          settlementNumber: settlementRecordId,
          grandTotal: String(record.grandTotal),
          currencyCode: record.currencySnapshot.currencyCode,
          currencySymbol: record.currencySnapshot.currencySymbol,
          paymentMethodSummary: paymentSummaryFromRecord(record),
          alreadySettled: true,
          settlementContext: unavailableCtx(),
        };
      }
    }
    throw err;
  }

  await tryMaterializeOrderSettlementProjections(
    getOrderSettlementProjectionStore(),
    {
      committedSettlements: financial.orderSettlement.settlements,
      events: financial.orderSettlementEvents,
    }
  );

  const record = financial.settlementRecord.record;
  if (!record) {
    // already_applied path should still include record; fall back to list.
    const records = await listSettlementRecordsForCheck({
      restaurantId: input.restaurantId,
      checkId,
    });
    const settlementRecordId = newestSettlementRecordId(records);
    if (!settlementRecordId) {
      throw new SettleOrderPaidError(
        "SETTLEMENT_RECORD_MISSING",
        "Settle completed without Settlement Record"
      );
    }
    const fallback = records.find(
      (r) => r.settlementRecordId === settlementRecordId
    )!;
    return {
      orderId: input.orderId,
      checkId,
      settlementRecordId,
      settlementNumber: settlementRecordId,
      grandTotal: String(fallback.grandTotal),
      currencyCode: fallback.currencySnapshot.currencyCode,
      currencySymbol: fallback.currencySnapshot.currencySymbol,
      paymentMethodSummary: paymentSummaryFromRecord(fallback),
      alreadySettled: financial.settlementRecord.outcome === "already_applied",
      settlementContext: financial.settlementContext,
    };
  }

  return {
    orderId: input.orderId,
    checkId,
    settlementRecordId: record.settlementRecordId,
    settlementNumber: record.settlementRecordId,
    grandTotal: String(record.grandTotal),
    currencyCode: record.currencySnapshot.currencyCode,
    currencySymbol: record.currencySnapshot.currencySymbol,
    paymentMethodSummary: paymentSummaryFromRecord(record),
    alreadySettled: financial.settlementRecord.outcome === "already_applied",
    settlementContext: financial.settlementContext,
  };
}
