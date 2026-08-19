/**
 * SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — Phase 4
 * SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 — Orders Workspace adoption
 * Staff Cancel + Settle for sessionless Self Ordering / Counter Pickup Checks.
 *
 * PAYMENT-CONFIRM-REMAINING-CALLERS-1 — Confirm Payment enters confirmPayment.
 * Reuses certified Check settle/void + Settlement Record + Attribution.
 * No trackingToken. No Session fabrication. No new money platform.
 * Counter Pickup remains an operational entry; Payment owns confirmation.
 *
 * CSA-03: staff settle requires registerId + resolved active Financial Shift.
 * CS-14: underlying Attribution remains fail-open after money commits.
 *
 * Callers: OrdersWorkspacePanel (REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1 —
 * Register Ops no longer hosts unpaid Order queues).
 */

import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb, getOrderById } from "../../db";
import {
  checkOrderMembership,
  operationalChecks,
  orders,
} from "../../../drizzle/schema";
import {
  CheckTransitionError,
  findBlockingMembershipForOrder,
  voidCheckByIdDetailed,
} from "../../operational-session/check";
import { confirmPayment } from "../../operational-session/payment/PaymentConfirmService";
import { listSettlementRecordsForCheck } from "../../operational-session/check/settlementRecordRepository";
import { getOrderSettlementProjectionStore } from "../../operational-session/check/api/orderSettlementReadComposition";
import { tryMaterializeOrderSettlementProjections } from "../../operational-session/check/read/orderSettlementProjectionMaterializer";
import { mapOrderDisplayIdentityFields } from "../read/presentation/mapOrderDisplayIdentity";
import { resolveSettlementContextForSettle } from "../../crmp/SettlementContextResolver";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import type { SettlementContext } from "@shared/crmp";
import { unavailableSettlementContext } from "@shared/crmp";
import type { OrderActor } from "../domain/value-objects/OrderActor";
import { advanceOrderStatusService } from "../composition";

export class StaffCounterPickupError extends Error {
  readonly code:
    | "ORDER_NOT_FOUND"
    | "CHECK_NOT_FOUND"
    | "CHECK_NOT_SETTLEABLE"
    | "CHECK_NOT_CANCELLABLE"
    | "ALREADY_SETTLED"
    | "REGISTER_REQUIRED"
    | "SHIFT_REQUIRED"
    | "SETTLEMENT_RECORD_MISSING";

  constructor(code: StaffCounterPickupError["code"], message: string) {
    super(message);
    this.name = "StaffCounterPickupError";
    this.code = code;
  }
}

export type UnpaidCounterPickupRow = Readonly<{
  checkId: number;
  orderId: number;
  restaurantId: number;
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  displayReference: string;
  orderStatus: string;
  serviceMode: string | null;
  createdAt: string;
  sessionId: number | null;
}>;

export type StaffSettleCounterPickupResult = Readonly<{
  orderId: number;
  checkId: number;
  settlementRecordId: string;
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  paymentMethodSummary: string;
  alreadySettled: boolean;
  settlementContext: SettlementContext;
}>;

export type StaffCancelCounterPickupResult = Readonly<{
  orderId: number;
  checkId: number;
  checkOutcome: string;
  orderStatus: string;
  alreadyCancelled: boolean;
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

function currencyFromCheckJson(raw: unknown): {
  currencyCode: string;
  currencySymbol: string;
} {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return {
      currencyCode: String(o.currencyCode ?? "SAR"),
      currencySymbol: String(o.currencySymbol ?? ""),
    };
  }
  return { currencyCode: "SAR", currencySymbol: "" };
}

/**
 * List open sessionless Checks (Counter Pickup / kiosk unpaid queue).
 */
export async function listUnpaidCounterPickupChecks(input: {
  restaurantId: number;
  query?: string;
  limit?: number;
}): Promise<readonly UnpaidCounterPickupRow[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const q = input.query?.trim() ?? "";

  const predicates = [
    eq(operationalChecks.restaurantId, input.restaurantId),
    eq(operationalChecks.outcome, "open"),
    isNull(operationalChecks.sessionId),
    eq(checkOrderMembership.restaurantId, input.restaurantId),
    eq(checkOrderMembership.active, 1),
    eq(orders.restaurantId, input.restaurantId),
  ];

  if (q) {
    const likeQ = `%${q}%`;
    predicates.push(
      or(
        like(orders.orderNumber, likeQ),
        sql`CAST(${orders.dailyDisplayNumber} AS CHAR) LIKE ${likeQ}`,
        sql`CAST(${orders.id} AS CHAR) LIKE ${likeQ}`
      )!
    );
  }

  const rows = await db
    .select({
      checkId: operationalChecks.id,
      orderId: orders.id,
      restaurantId: operationalChecks.restaurantId,
      grandTotal: operationalChecks.grandTotal,
      currencySnapshotJson: operationalChecks.currencySnapshotJson,
      orderStatus: orders.status,
      serviceMode: orders.serviceMode,
      orderNumber: orders.orderNumber,
      businessDay: orders.businessDay,
      dailyDisplayNumber: orders.dailyDisplayNumber,
      createdAt: operationalChecks.createdAt,
      sessionId: operationalChecks.sessionId,
    })
    .from(operationalChecks)
    .innerJoin(
      checkOrderMembership,
      and(
        eq(checkOrderMembership.checkId, operationalChecks.id),
        eq(checkOrderMembership.restaurantId, operationalChecks.restaurantId)
      )
    )
    .innerJoin(
      orders,
      and(
        eq(orders.id, checkOrderMembership.orderId),
        eq(orders.restaurantId, operationalChecks.restaurantId)
      )
    )
    .where(and(...predicates))
    .orderBy(desc(operationalChecks.createdAt))
    .limit(limit);

  return rows.map((row) => {
    const currency = currencyFromCheckJson(row.currencySnapshotJson);
    const identity = mapOrderDisplayIdentityFields({
      orderNumber: row.orderNumber,
      businessDay: row.businessDay ?? null,
      dailyDisplayNumber: row.dailyDisplayNumber ?? null,
    });
    return {
      checkId: row.checkId,
      orderId: row.orderId,
      restaurantId: row.restaurantId,
      grandTotal: String(row.grandTotal),
      currencyCode: currency.currencyCode,
      currencySymbol: currency.currencySymbol,
      displayReference: identity.displayReference,
      orderStatus: String(row.orderStatus),
      serviceMode: row.serviceMode ?? null,
      createdAt: String(row.createdAt),
      sessionId: row.sessionId ?? null,
    };
  });
}

async function requireOpenSessionlessMembership(input: {
  restaurantId: number;
  orderId: number;
}): Promise<{ checkId: number; checkOutcome: string }> {
  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new StaffCounterPickupError("ORDER_NOT_FOUND", "Order not found");
  }
  const membership = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId
  );
  if (!membership) {
    throw new StaffCounterPickupError(
      "CHECK_NOT_FOUND",
      "No Check enrolled for Order"
    );
  }
  return {
    checkId: membership.membership.checkId,
    checkOutcome: membership.checkOutcome,
  };
}

/**
 * Staff settle — sessionless Check via Payment Confirm process.
 * Requires active Register hint + resolved Financial Shift (CSA-03).
 * Authorization (Register/Shift) remains on this operational entry.
 */
export async function settleCounterPickupPaid(input: {
  restaurantId: number;
  orderId: number;
  operatorUserId: number;
  registerId: string;
  settlements?: readonly StaffSettlementLineInput[];
  deviceId?: string | null;
  operationalScreenId?: string | null;
}): Promise<StaffSettleCounterPickupResult> {
  const registerId = input.registerId.trim();
  if (!registerId) {
    throw new StaffCounterPickupError(
      "REGISTER_REQUIRED",
      "Active Register is required for Counter Pickup settle"
    );
  }

  const { checkId, checkOutcome } = await requireOpenSessionlessMembership({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
  });

  const unavailableCtx = () =>
    unavailableSettlementContext(
      input.restaurantId,
      new Date().toISOString(),
      ["already_settled_no_live_context"]
    );

  if (checkOutcome === "paid") {
    const records = await listSettlementRecordsForCheck({
      restaurantId: input.restaurantId,
      checkId,
    });
    const settlementRecordId = newestSettlementRecordId(records);
    if (!settlementRecordId) {
      throw new StaffCounterPickupError(
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
      grandTotal: String(record.grandTotal),
      currencyCode: record.currencySnapshot.currencyCode,
      currencySymbol: record.currencySnapshot.currencySymbol,
      paymentMethodSummary: paymentSummaryFromRecord(record),
      alreadySettled: true,
      settlementContext: unavailableCtx(),
    };
  }

  if (checkOutcome !== "open") {
    throw new StaffCounterPickupError(
      "CHECK_NOT_SETTLEABLE",
      `Check outcome ${checkOutcome} cannot be settled paid`
    );
  }

  const settlementContextHints = {
    registerId,
    deviceId: input.deviceId,
    operatorUserId: input.operatorUserId,
    operationalScreenId: input.operationalScreenId,
  };

  const settlementContext = await resolveSettlementContextForSettle({
    restaurantId: input.restaurantId,
    ...settlementContextHints,
  });

  if (!settlementContext.registerId) {
    throw new StaffCounterPickupError(
      "REGISTER_REQUIRED",
      "Could not resolve Register for settle"
    );
  }
  if (!settlementContext.financialShiftId) {
    throw new StaffCounterPickupError(
      "SHIFT_REQUIRED",
      "An open Financial Shift is required on the active Register"
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
    const records = await listSettlementRecordsForCheck({
      restaurantId: input.restaurantId,
      checkId,
    });
    const settlementRecordId = newestSettlementRecordId(records);
    if (!settlementRecordId) {
      throw new StaffCounterPickupError(
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
    grandTotal: String(record.grandTotal),
    currencyCode: record.currencySnapshot.currencyCode,
    currencySymbol: record.currencySnapshot.currencySymbol,
    paymentMethodSummary: paymentSummaryFromRecord(record),
    alreadySettled: financial.settlementRecord.outcome === "already_applied",
    settlementContext: financial.settlementContext,
  };
}

/**
 * Cancel before settle: void unpaid sessionless Check + cancel Order.
 * Never mutates historical Settlement Records (CSA-06).
 */
export async function cancelCounterPickupUnpaid(input: {
  restaurantId: number;
  orderId: number;
  operatorUserId: number;
  actor: OrderActor;
  registerId?: string | null;
  reason?: string;
}): Promise<StaffCancelCounterPickupResult> {
  const { checkId, checkOutcome } = await requireOpenSessionlessMembership({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
  });

  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new StaffCounterPickupError("ORDER_NOT_FOUND", "Order not found");
  }

  if (checkOutcome === "paid" || checkOutcome === "complimentary") {
    throw new StaffCounterPickupError(
      "ALREADY_SETTLED",
      "Settled Checks cannot be cancelled — use refund workflow"
    );
  }

  if (checkOutcome === "voided" && order.status === "cancelled") {
    return {
      orderId: input.orderId,
      checkId,
      checkOutcome: "voided",
      orderStatus: "cancelled",
      alreadyCancelled: true,
    };
  }

  if (checkOutcome === "open") {
    const hints = {
      registerId: input.registerId ?? null,
      operatorUserId: input.operatorUserId,
    };
    try {
      await voidCheckByIdDetailed({
        restaurantId: input.restaurantId,
        checkId,
        settlementContextHints: hints,
      });
    } catch (err) {
      if (!(err instanceof CheckTransitionError)) throw err;
      // Race: re-read
      const membership = await findBlockingMembershipForOrder(
        input.restaurantId,
        input.orderId
      );
      if (membership?.checkOutcome === "paid") {
        throw new StaffCounterPickupError(
          "ALREADY_SETTLED",
          "Check was settled concurrently"
        );
      }
      if (membership?.checkOutcome !== "voided") throw err;
    }
  }

  const statusResult = await advanceOrderStatusService.execute({
    orderId: input.orderId,
    targetStatus: "cancelled",
    actor: input.actor,
  });

  return {
    orderId: input.orderId,
    checkId,
    checkOutcome: "voided",
    orderStatus: statusResult.newStatus,
    alreadyCancelled: statusResult.previousStatus === "cancelled",
  };
}
