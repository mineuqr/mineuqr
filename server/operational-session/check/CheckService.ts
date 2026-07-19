/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — Check sub-domain application service.
 * CHECK-SETTLEMENT-METHODS-1 — settlement transactions under Check.
 *
 * Owned by Operational Session Platform. Does not modify Order Domain.
 */

import { getOrdersBySessionId, getRestaurantById } from "../../db";
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

export class CheckTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckTransitionError";
  }
}

async function loadOrdersSubtotal(
  restaurantId: number,
  sessionId: number
): Promise<string> {
  const orderRows = await getOrdersBySessionId(restaurantId, sessionId);
  return computeOrdersTotalAmount(orderRows);
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
    return mapRowToOperationalCheck(existing);
  }

  const { currencySnapshot, taxPolicySnapshot } =
    await captureSnapshotsFromBusinessSettings(input.restaurantId);
  const ordersSubtotal = await loadOrdersSubtotal(
    input.restaurantId,
    input.sessionId
  );
  const money = computeCheckMoney({
    ordersSubtotal,
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

  // M1 dual-write — membership sync; Session scan remains money authority.
  await dualWriteSyncSessionOrdersToCheck({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    checkId,
  });

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

    const ordersSubtotal = await loadOrdersSubtotal(
      input.restaurantId,
      input.sessionId
    );
    const money = computeCheckMoney({
      ordersSubtotal,
      billDiscountAmount: check.billDiscountAmount,
      taxPolicySnapshot: check.taxPolicySnapshot,
    });

    await updateCheckMoney({
      checkId: check.id,
      restaurantId: input.restaurantId,
      subtotal: money.subtotal,
      taxAmount: money.taxAmount,
      taxBreakdown: money.taxBreakdown,
      grandTotal: money.grandTotal,
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

  const ordersSubtotal = await loadOrdersSubtotal(
    input.restaurantId,
    input.sessionId
  );
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
