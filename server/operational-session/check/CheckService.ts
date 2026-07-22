/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — Check sub-domain application service.
 * CHECK-SETTLEMENT-METHODS-1 — settlement transactions under Check.
 * CHECK-GENERALIZATION-M3 — Membership is authoritative Order discovery for money.
 * CHECK-GENERALIZATION-M4 — Session optional for financial correctness (Check-centric APIs).
 *
 * Owned by Operational Session Platform. Does not modify Order Domain.
 */

import {
  getOrdersByIds,
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
  deactivateMembershipsOnCheckVoid,
  enrollOrderInCheck,
  syncSessionOrdersToCheck,
  CheckMembershipError,
} from "./checkMembershipService";
import {
  findBlockingMembershipForOrder,
  listActiveOrderIdsForCheck,
} from "./checkOrderMembershipRepository";

export class CheckTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckTransitionError";
  }
}

/**
 * COMPATIBILITY-CLEANUP-1 — Check Order money discovery is Membership-only.
 */
async function loadOrdersSubtotal(input: {
  restaurantId: number;
  checkId: number;
}): Promise<string> {
  const orderIds = await listActiveOrderIdsForCheck(
    input.restaurantId,
    input.checkId
  );
  const orderRows = await getOrdersByIds(input.restaurantId, orderIds);
  return computeOrdersTotalAmount(orderRows);
}

async function refreshOpenCheckMoneyFromDiscovery(input: {
  restaurantId: number;
  checkId: number;
  billDiscountAmount: string;
  taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
}): Promise<void> {
  const ordersSubtotal = await loadOrdersSubtotal({
    restaurantId: input.restaurantId,
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
    // Authoritative Membership sync (not dual-write gated).
    await syncSessionOrdersToCheck({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      checkId: existing.id,
    });
    if (existing.outcome === "open") {
      const mapped = mapRowToOperationalCheck(existing);
      await refreshOpenCheckMoneyFromDiscovery({
        restaurantId: input.restaurantId,
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
  // Seed zeros; money authority comes from Membership after authoritative sync.
  const money = computeCheckMoney({
    ordersSubtotal: "0.00",
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

  // Authoritative Membership ownership, then money refresh.
  await syncSessionOrdersToCheck({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    checkId,
  });

  await refreshOpenCheckMoneyFromDiscovery({
    restaurantId: input.restaurantId,
    checkId,
    billDiscountAmount: "0.00",
    taxPolicySnapshot,
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

    await refreshOpenCheckMoneyFromDiscovery({
      restaurantId: input.restaurantId,
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

/**
 * M4 — Check-centric finalize. Does not require Session existence.
 */
async function finalizeOpenCheckById(
  input: {
    restaurantId: number;
    checkId: number;
    outcome: Exclude<CheckOutcome, "open">;
    settlements?: readonly StaffSettlementLineInput[];
  },
  client?: SessionDbClient
): Promise<OperationalCheck> {
  const check = await getCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
  });
  if (!check) {
    throw new DiningSessionUnavailableError("Check not found");
  }
  if (check.outcome !== "open") {
    throw new CheckTransitionError(
      `Cannot finalize check from outcome ${check.outcome}`
    );
  }

  const ordersSubtotal = await loadOrdersSubtotal({
    restaurantId: input.restaurantId,
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
        sessionId: check.sessionId,
        currencyCode: check.currencySnapshot.currencyCode,
        businessTimestamp: now,
        lines: settlementLines,
      },
      client
    );
  }

  if (input.outcome === "voided") {
    await deactivateMembershipsOnCheckVoid({
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

// ─── M4 Check-centric financial APIs (Session optional) ───────────

/**
 * Recalculate an open Check by id — no Session required.
 */
export async function recalculateOpenCheck(input: {
  restaurantId: number;
  checkId: number;
}): Promise<OperationalCheck | null> {
  try {
    const check = await getCheckById(input);
    if (!check) return null;
    const decision = decideCheckRecalculation(
      check.outcome,
      check.totalsFrozenAt
    );
    if (!decision.allowed) {
      return check;
    }

    await refreshOpenCheckMoneyFromDiscovery({
      restaurantId: input.restaurantId,
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

/**
 * Create an open Check with optional Session link.
 * `sessionId: null` → sessionless finance (kiosk/counter path).
 */
export async function createOpenCheck(input: {
  restaurantId: number;
  sessionId: number | null;
}): Promise<OperationalCheck> {
  if (input.sessionId != null) {
    return createOpenCheckForSession({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
    });
  }

  const { currencySnapshot, taxPolicySnapshot } =
    await captureSnapshotsFromBusinessSettings(input.restaurantId);
  const money = computeCheckMoney({
    ordersSubtotal: "0.00",
    billDiscountAmount: "0.00",
    taxPolicySnapshot,
  });
  const snapshotsFrozenAt = formatDiningSessionTimestamp();

  const checkId = await insertOperationalCheck({
    restaurantId: input.restaurantId,
    sessionId: null,
    currencySnapshot,
    taxPolicySnapshot,
    subtotal: money.subtotal,
    taxAmount: money.taxAmount,
    taxBreakdown: money.taxBreakdown,
    grandTotal: money.grandTotal,
    snapshotsFrozenAt,
  });

  const row = await findCheckById(checkId);
  if (!row) {
    throw new DiningSessionUnavailableError("Check not found after create");
  }
  return mapRowToOperationalCheck(row);
}

/**
 * Ensure an open Check for an Order via Membership (sessionless-capable).
 * Creates a sessionless Check when none exists; enrolls the Order; recalculates.
 */
export async function ensureCheckForOrder(input: {
  restaurantId: number;
  orderId: number;
}): Promise<OperationalCheck> {
  const blocking = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId
  );

  if (blocking) {
    if (blocking.checkOutcome !== "open") {
      throw new CheckMembershipError(
        `Order ${input.orderId} already enrolled on ${blocking.checkOutcome} Check ${blocking.membership.checkId}`
      );
    }
    const existing = await getCheckById({
      restaurantId: input.restaurantId,
      checkId: blocking.membership.checkId,
    });
    if (!existing) {
      throw new DiningSessionUnavailableError("Check not found for membership");
    }
    await enrollOrderInCheck({
      restaurantId: input.restaurantId,
      checkId: existing.id,
      orderId: input.orderId,
      enrolledReason: "order_place",
    });
    return (await recalculateOpenCheck({
      restaurantId: input.restaurantId,
      checkId: existing.id,
    })) ?? existing;
  }

  const created = await createOpenCheck({
    restaurantId: input.restaurantId,
    sessionId: null,
  });

  await enrollOrderInCheck({
    restaurantId: input.restaurantId,
    checkId: created.id,
    orderId: input.orderId,
    enrolledReason: "order_place",
  });

  return (
    (await recalculateOpenCheck({
      restaurantId: input.restaurantId,
      checkId: created.id,
    })) ?? created
  );
}

export async function settleCheckPaidById(input: {
  restaurantId: number;
  checkId: number;
  settlements?: readonly StaffSettlementLineInput[];
}): Promise<OperationalCheck> {
  return finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "paid",
    settlements: input.settlements,
  });
}

export async function settleCheckComplimentaryById(input: {
  restaurantId: number;
  checkId: number;
}): Promise<OperationalCheck> {
  return finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "complimentary",
  });
}

export async function voidCheckById(input: {
  restaurantId: number;
  checkId: number;
}): Promise<OperationalCheck> {
  return finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "voided",
  });
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
