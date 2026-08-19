/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — Check-owned Charge composition.
 *
 * Charge creation MAY snapshot an Order once.
 * Bill calculation MUST sum persisted Charges only — never live Order totals.
 */

import { randomUUID } from "node:crypto";
import { getOrderById, getOrderItemsByOrderId } from "../../db";
import { formatDiningSessionTimestamp } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import {
  ChargeCompositionError,
  parseChargeMoney,
  sumChargeNetAmounts,
  planOpenChargeCorrections,
  type IntendedChargeLine,
} from "@shared/operational-session/check/charge";
import { findCheckById } from "./checkRepository";
import { parseCurrencySnapshot } from "./checkMapper";
import {
  findBlockingMembershipForOrder,
  listActiveOrderIdsForCheck,
} from "./checkOrderMembershipRepository";
import {
  insertCheckCharge,
  listCheckCharges,
  nextCheckChargeSequence,
} from "./checkChargeRepository";

function isDuplicateChargeKeyError(error: unknown): boolean {
  const candidate = error as { errno?: number; code?: string };
  return candidate.errno === 1062 || candidate.code === "ER_DUP_ENTRY";
}

export type OpenOrderChargeReconcileResult = {
  checkId: number | null;
  applied: boolean;
};

export async function loadChargesSubtotal(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<string> {
  const charges = await listCheckCharges(input, client);
  return sumChargeNetAmounts(charges);
}

/**
 * One-time catch-up for open Checks that have membership but no Charges yet.
 * Not a live calculation path: subsequent recals sum Charges only.
 */
export async function ensureOpenCheckChargeComposition(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<void> {
  const row = await findCheckById(input.checkId, client);
  if (!row || row.restaurantId !== input.restaurantId) return;
  if (row.outcome !== "open") return;
  const existing = await listCheckCharges(input, client);
  if (existing.length > 0) return;
  const orderIds = await listActiveOrderIdsForCheck(
    input.restaurantId,
    input.checkId,
    client
  );
  for (const orderId of orderIds) {
    await snapshotChargesForEnrolledOrder(
      {
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        orderId,
      },
      client
    );
  }
}

export async function snapshotChargesForEnrolledOrder(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
  },
  client?: SessionDbClient
): Promise<void> {
  await reconcileOpenOrderCharges(
    {
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      checkId: input.checkId,
    },
    client
  );
}

/**
 * OPEN-Bill Charge correction from an Order item snapshot.
 * Bill calculation still sums persisted Charges only.
 * Duplicate calls are no-ops once origin nets already match intended.
 */
export async function reconcileOpenOrderCharges(
  input: {
    restaurantId: number;
    orderId: number;
    checkId?: number;
  },
  client?: SessionDbClient
): Promise<OpenOrderChargeReconcileResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await reconcileOpenOrderChargesOnce(input, client);
    } catch (error) {
      if (!isDuplicateChargeKeyError(error) || attempt === 2) {
        throw error;
      }
    }
  }
  return { checkId: input.checkId ?? null, applied: false };
}

async function reconcileOpenOrderChargesOnce(
  input: {
    restaurantId: number;
    orderId: number;
    checkId?: number;
  },
  client?: SessionDbClient
): Promise<OpenOrderChargeReconcileResult> {
  let checkId = input.checkId ?? null;
  if (checkId == null) {
    const blocking = await findBlockingMembershipForOrder(
      input.restaurantId,
      input.orderId,
      client
    );
    if (!blocking) {
      return { checkId: null, applied: false };
    }
    checkId = blocking.membership.checkId;
    if (blocking.checkOutcome !== "open") {
      return { checkId, applied: false };
    }
  }

  const row = await findCheckById(checkId, client);
  if (!row || row.restaurantId !== input.restaurantId) {
    throw new ChargeCompositionError("Check not found for Charge snapshot");
  }
  if (row.outcome !== "open") {
    return { checkId, applied: false };
  }

  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new ChargeCompositionError("Order not found for Charge snapshot");
  }
  if (order.restaurantId !== input.restaurantId) {
    throw new ChargeCompositionError(
      "Cross-tenant Charge correction rejected"
    );
  }

  const charges = await listCheckCharges(
    { restaurantId: input.restaurantId, checkId },
    client
  );
  const intended = await intendedLinesForOrder(order);
  const plan = planOpenChargeCorrections({
    orderId: input.orderId,
    charges,
    intended,
  });
  if (plan.length === 0) {
    return { checkId, applied: false };
  }

  const currencyCode = parseCurrencySnapshot(row.currencySnapshotJson).currencyCode;
  const createdAt = formatDiningSessionTimestamp();
  const originChannel =
    typeof order.orderingChannel === "string" && order.orderingChannel.length > 0
      ? order.orderingChannel
      : null;
  let sequence = await nextCheckChargeSequence(
    { restaurantId: input.restaurantId, checkId },
    client
  );
  for (const correction of plan) {
    await insertCheckCharge(
      {
        chargeId: `chg_${randomUUID()}`,
        restaurantId: input.restaurantId,
        checkId,
        sequence,
        description: correction.description,
        quantity: correction.quantity,
        unitPrice: correction.unitPrice,
        lineDiscount: correction.lineDiscount,
        modifierAmount: correction.modifierAmount,
        netAmount: correction.netAmount,
        taxCategory: null,
        taxAmount: "0.00",
        currencyCode,
        originOrderId: input.orderId,
        originOrderItemId: correction.originOrderItemId,
        originChannel,
        originReference: correction.originReference,
        createdAt,
      },
      client
    );
    sequence += 1;
  }
  return { checkId, applied: true };
}

async function intendedLinesForOrder(order: {
  id: number;
  status: string;
  orderNumber?: string | null;
  totalAmount?: string | number | null;
}): Promise<IntendedChargeLine[]> {
  if (order.status === "cancelled") {
    return [];
  }
  const items = (await getOrderItemsByOrderId(order.id)) ?? [];
  if (items.length === 0) {
    const unitPrice = String(order.totalAmount ?? "0.00");
    if (parseChargeMoney(unitPrice) === 0) return [];
    return [
      {
        originOrderItemId: null,
        description: `Order ${order.orderNumber}`,
        quantity: 1,
        unitPrice,
      },
    ];
  }
  const lines: IntendedChargeLine[] = [];
  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) continue;
    lines.push({
      originOrderItemId: item.id,
      description: item.nameEn || item.nameAr || `Item ${item.id}`,
      quantity,
      unitPrice: String(item.price ?? "0.00"),
    });
  }
  return lines;
}

export async function compensateChargesForCancelledOrder(
  input: { restaurantId: number; orderId: number },
  client?: SessionDbClient
): Promise<{ checkId: number | null; compensated: boolean }> {
  const result = await reconcileOpenOrderCharges(input, client);
  return { checkId: result.checkId, compensated: result.applied };
}
