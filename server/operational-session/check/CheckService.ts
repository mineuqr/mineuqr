/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — Check sub-domain application service.
 * CHECK-SETTLEMENT-METHODS-1 — settlement transactions under Check.
 * CHECK-GENERALIZATION-M3 — Membership is authoritative Order discovery for money.
 *
 * Owned by Operational Session Platform. Does not modify Order Domain.
 */

import { ENV } from "../../_core/env";
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import {
  getOrdersByIds,
  getOrdersBySessionId,
  getRestaurantById,
} from "../../db";
import { computeOrdersTotalAmount } from "../../diningSession/sessionOrderTotals";
import {
  findSessionById,
  updateSessionActiveCheckId,
  type SessionDbClient,
} from "../../diningSession/sessionRepository";
import {
  DiningSessionNotFoundError,
  DiningSessionTransitionError,
  DiningSessionUnavailableError,
  DiningSessionValidationError,
  formatDiningSessionTimestamp,
} from "../../diningSession/sessionTypes";
import {
  businessTaxSettingsFromRestaurantRow,
  captureCurrencySnapshot,
  captureTaxPolicySnapshot,
  complimentarySettlementLine,
  computeCheckMoney,
  decideCheckRecalculation,
  defaultPaidSettlementLine,
  resolveStaffSettlementLines,
  SettlementValidationError,
  type CheckOutcome,
  type OperationalCheck,
  type SettlementTransactionInput,
  type StaffSettlementLineInput,
} from "@shared/operational-session";
import { mapRowToOperationalCheck } from "./checkMapper";
import {
  finalizeCheckOutcome,
  findCheckById,
  findOpenCheckBySessionId,
  insertOperationalCheck,
  updateCheckMoney,
} from "./checkRepository";
import { insertSettlementTransactions } from "./settlementTransactionRepository";
import {
  dualWriteDeactivateMembershipsOnVoid,
  dualWriteSyncSessionOrdersToCheck,
} from "./checkMembershipService";
import { listActiveOrderIdsForCheck } from "./checkOrderMembershipRepository";

export class CheckTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckTransitionError";
  }
}

/**
 * M3 — Check Order money discovery.
 * Authoritative: membership → Order ids → non-cancelled totals.
 * Rollback: Session scan (only while dual-write remains operational).
 */
async function loadOrdersSubtotal(input: {
  restaurantId: number;
  sessionId: number;
  checkId: number;
}): Promise<string> {
  if (ENV.checkMembershipAuthoritativeRead) {
    if (!ENV.checkMembershipDualWrite) {
      opsLog({
        type: OPS_EVENT.check_membership_dual_write_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        procedure: "loadOrdersSubtotal",
        metadata: {
          checkId: input.checkId,
          sessionId: input.sessionId,
          reason: "authoritative_read_without_dual_write",
        },
      });
    }
    const orderIds = await listActiveOrderIdsForCheck(
      input.restaurantId,
      input.checkId
    );
    const orderRows = await getOrdersByIds(input.restaurantId, orderIds);
    return computeOrdersTotalAmount(orderRows);
  }

  const orderRows = await getOrdersBySessionId(
    input.restaurantId,
    input.sessionId
  );
  return computeOrdersTotalAmount(orderRows);
}

/** Bootstrap seed for brand-new Check insert before membership rows exist. */
async function loadOrdersSubtotalFromSession(
  restaurantId: number,
  sessionId: number
): Promise<string> {
  const orderRows = await getOrdersBySessionId(restaurantId, sessionId);
  return computeOrdersTotalAmount(orderRows);
}

async function refreshOpenCheckMoneyFromDiscovery(input: {
  restaurantId: number;
  sessionId: number;
  checkId: number;
  billDiscountAmount: string;
  taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
}): Promise<void> {
  const ordersSubtotal = await loadOrdersSubtotal({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    checkId: input.checkId,
  });
  const money = computeCheckMoney({
    ordersSubtotal,
    billDiscountAmount: input.billDiscountAmount,
    taxPolicySnapshot: input.taxPolicySnapshot,
  });
  await updateCheckMoney({
    checkId: input.checkId,
    restaurantId: input.restaurantId,
    subtotal: money.subtotal,
    taxAmount: money.taxAmount,
    taxBreakdown: money.taxBreakdown,
    grandTotal: money.grandTotal,
  });
}

async function captureSnapshotsFromBusinessSettings(restaurantId: number) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new DiningSessionValidationError("Restaurant not found");
  }
  const settings = businessTaxSettingsFromRestaurantRow({
    currencyCode: restaurant.currencyCode,
    currencySymbol: restaurant.currencySymbol,
    taxEnabled: (restaurant as { taxEnabled?: boolean }).taxEnabled,
    taxMode: (restaurant as { taxMode?: string }).taxMode,
    taxPolicyJson: (restaurant as { taxPolicyJson?: string | null }).taxPolicyJson,
  });
  return {
    currencySnapshot: captureCurrencySnapshot(settings),
    taxPolicySnapshot: captureTaxPolicySnapshot(settings),
  };
}

/**
 * Create an Open Check for a Session with immutable snapshots.
 * Check id is generated independently of sessionId.
 */
export async function createOpenCheckForSession(
  input: {
    restaurantId: number;
    sessionId: number;
  },
  client?: SessionDbClient
): Promise<OperationalCheck> {
  const session = await findSessionById(input.sessionId, client);
  if (!session || session.restaurantId !== input.restaurantId) {
    throw new DiningSessionNotFoundError();
  }

  const existing = await findOpenCheckBySessionId(
    input.restaurantId,
    input.sessionId,
    client
  );
  if (existing) {
    await dualWriteSyncSessionOrdersToCheck({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      checkId: existing.id,
    });
    if (ENV.checkMembershipAuthoritativeRead && existing.outcome === "open") {
      const mapped = mapRowToOperationalCheck(existing);
      await refreshOpenCheckMoneyFromDiscovery({
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
        checkId: existing.id,
        billDiscountAmount: mapped.billDiscountAmount,
        taxPolicySnapshot: mapped.taxPolicySnapshot,
      });
      const refreshed = await findCheckById(existing.id, client);
      return refreshed
        ? mapRowToOperationalCheck(refreshed)
        : mapped;
    }
    return mapRowToOperationalCheck(existing);
  }

  const { currencySnapshot, taxPolicySnapshot } =
    await captureSnapshotsFromBusinessSettings(input.restaurantId);
  // Insert seed: Session scan (membership rows do not exist until after insert + sync).
  const seedSubtotal = await loadOrdersSubtotalFromSession(
    input.restaurantId,
    input.sessionId
  );
  const money = computeCheckMoney({
    ordersSubtotal: seedSubtotal,
    billDiscountAmount: "0.00",
    taxPolicySnapshot,
  });
  const snapshotsFrozenAt = formatDiningSessionTimestamp();

  const checkId = await insertOperationalCheck(
    {
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      currencySnapshot,
      taxPolicySnapshot,
      subtotal: money.subtotal,
      taxAmount: money.taxAmount,
      taxBreakdown: money.taxBreakdown,
      grandTotal: money.grandTotal,
      snapshotsFrozenAt,
    },
    client
  );

  await updateSessionActiveCheckId(
    {
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      activeCheckId: checkId,
    },
    client
  );

  // Dual-write membership, then authoritative money refresh when M3 is ON.
  await dualWriteSyncSessionOrdersToCheck({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    checkId,
  });

  if (ENV.checkMembershipAuthoritativeRead) {
    await refreshOpenCheckMoneyFromDiscovery({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      checkId,
      billDiscountAmount: "0.00",
      taxPolicySnapshot,
    });
  }

  const row = await findCheckById(checkId, client);
  if (!row) {
    throw new DiningSessionUnavailableError("Check not found after create");
  }
  return mapRowToOperationalCheck(row);
}

/** Lazy ensure for legacy open sessions created before Check Management. */
export async function ensureOpenCheckForSession(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck> {
  const session = await findSessionById(input.sessionId);
  if (!session || session.restaurantId !== input.restaurantId) {
    throw new DiningSessionNotFoundError();
  }

  if (session.activeCheckId != null) {
    const byId = await findCheckById(session.activeCheckId);
    if (byId && byId.outcome === "open") {
      return mapRowToOperationalCheck(byId);
    }
  }

  const open = await findOpenCheckBySessionId(
    input.restaurantId,
    input.sessionId
  );
  if (open) {
    if (session.activeCheckId !== open.id) {
      await updateSessionActiveCheckId({
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
        activeCheckId: open.id,
      });
    }
    return mapRowToOperationalCheck(open);
  }

  return createOpenCheckForSession(input);
}

/**
 * Recalculate monetary fields for an open Check using frozen snapshots.
 * No-op when totals are frozen (terminal outcomes).
 */
export async function recalculateOpenCheckForSession(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck | null> {
  try {
    const check = await ensureOpenCheckForSession(input);
    const decision = decideCheckRecalculation(
      check.outcome,
      check.totalsFrozenAt
    );
    if (!decision.allowed) {
      return check;
    }

    await refreshOpenCheckMoneyFromDiscovery({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      checkId: check.id,
      billDiscountAmount: check.billDiscountAmount,
      taxPolicySnapshot: check.taxPolicySnapshot,
    });

    const row = await findCheckById(check.id);
    return row ? mapRowToOperationalCheck(row) : check;
  } catch {
    return null;
  }
}

async function finalizeOpenCheck(
  input: {
    restaurantId: number;
    sessionId: number;
    outcome: Exclude<CheckOutcome, "open">;
    /**
     * SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — operator tender lines.
     * Omitted → legacy default full-cover `other`.
     */
    settlements?: readonly StaffSettlementLineInput[];
  },
  client?: SessionDbClient
): Promise<OperationalCheck> {
  const check = await ensureOpenCheckForSession({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
  });

  if (check.outcome !== "open") {
    throw new CheckTransitionError(
      `Cannot finalize check from outcome ${check.outcome}`
    );
  }

  const ordersSubtotal = await loadOrdersSubtotal({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    checkId: check.id,
  });
  const money = computeCheckMoney({
    ordersSubtotal,
    billDiscountAmount: check.billDiscountAmount,
    taxPolicySnapshot: check.taxPolicySnapshot,
  });
  const now = formatDiningSessionTimestamp();

  let settlementLines: readonly SettlementTransactionInput[] | null = null;
  try {
    if (input.outcome === "paid") {
      settlementLines = input.settlements?.length
        ? resolveStaffSettlementLines(money.grandTotal, input.settlements)
        : [defaultPaidSettlementLine(money.grandTotal)];
    } else if (input.outcome === "complimentary") {
      settlementLines = [complimentarySettlementLine(money.grandTotal)];
    }
  } catch (err) {
    if (err instanceof SettlementValidationError) {
      throw new DiningSessionValidationError(err.message);
    }
    throw err;
  }

  await finalizeCheckOutcome(
    {
      checkId: check.id,
      restaurantId: input.restaurantId,
      outcome: input.outcome,
      subtotal: money.subtotal,
      taxAmount: money.taxAmount,
      taxBreakdown: money.taxBreakdown,
      grandTotal: money.grandTotal,
      totalsFrozenAt: now,
      settledAt:
        input.outcome === "paid" || input.outcome === "complimentary"
          ? now
          : null,
      voidedAt: input.outcome === "voided" ? now : null,
    },
    client
  );

  if (settlementLines) {
    await insertSettlementTransactions(
      {
        restaurantId: input.restaurantId,
        checkId: check.id,
        sessionId: input.sessionId,
        currencyCode: check.currencySnapshot.currencyCode,
        businessTimestamp: now,
        lines: settlementLines,
      },
      client
    );
  }

  if (input.outcome === "voided") {
    await dualWriteDeactivateMembershipsOnVoid({
      restaurantId: input.restaurantId,
      checkId: check.id,
    });
  }

  const row = await findCheckById(check.id, client);
  if (!row) {
    throw new DiningSessionUnavailableError("Check not found after finalize");
  }
  return mapRowToOperationalCheck(row);
}

/**
 * Settle Check Paid — freezes totals + records settlement transaction(s).
 * Session close remains Session responsibility.
 * Omitting `settlements` writes one `other` tender for grandTotal (backward compatible).
 * SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — supplied settlements persist operator tenders.
 */
export async function settleCheckPaid(input: {
  restaurantId: number;
  sessionId: number;
  settlements?: readonly StaffSettlementLineInput[];
}): Promise<OperationalCheck> {
  return finalizeOpenCheck({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    outcome: "paid",
    settlements: input.settlements,
  });
}

export async function settleCheckComplimentary(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck> {
  return finalizeOpenCheck({ ...input, outcome: "complimentary" });
}

/** Void Check — operational abandon; distinct from Order cancelled. */
export async function voidCheck(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck> {
  const session = await findSessionById(input.sessionId);
  if (!session || session.restaurantId !== input.restaurantId) {
    throw new DiningSessionNotFoundError();
  }
  if (session.status === "closed") {
    throw new DiningSessionTransitionError("Session is closed");
  }
  return finalizeOpenCheck({ ...input, outcome: "voided" });
}

export async function getCheckById(input: {
  restaurantId: number;
  checkId: number;
}): Promise<OperationalCheck | null> {
  const row = await findCheckById(input.checkId);
  if (!row || row.restaurantId !== input.restaurantId) return null;
  return mapRowToOperationalCheck(row);
}

export async function getActiveCheckForSession(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck | null> {
  const session = await findSessionById(input.sessionId);
  if (!session || session.restaurantId !== input.restaurantId) return null;
  if (session.activeCheckId != null) {
    const byId = await findCheckById(session.activeCheckId);
    if (byId) return mapRowToOperationalCheck(byId);
  }
  const open = await findOpenCheckBySessionId(
    input.restaurantId,
    input.sessionId
  );
  return open ? mapRowToOperationalCheck(open) : null;
}
