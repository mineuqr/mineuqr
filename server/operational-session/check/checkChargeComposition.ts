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
  computeChargeNetAmount,
  originNetAmount,
  parseChargeMoney,
  sumChargeNetAmounts,
  buildReversalCharge,
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

function assertOpenCheckOutcome(outcome: string, action: string): void {
  if (outcome !== "open") {
    throw new ChargeCompositionError(
      `Cannot ${action} Charges on ${outcome} Check`
    );
  }
}

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
  const row = await findCheckById(input.checkId, client);
  if (!row || row.restaurantId !== input.restaurantId) {
    throw new ChargeCompositionError("Check not found for Charge snapshot");
  }
  if (row.outcome !== "open") {
    return;
  }

  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new ChargeCompositionError("Order not found for Charge snapshot");
  }
  if (order.status === "cancelled") {
    return;
  }

  const charges = await listCheckCharges(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );
  if (parseChargeMoney(originNetAmount(charges, { orderId: input.orderId })) !== 0) {
    return;
  }

  const items = await getOrderItemsByOrderId(input.orderId);
  const currencyCode = parseCurrencySnapshot(row.currencySnapshotJson).currencyCode;
  const createdAt = formatDiningSessionTimestamp();
  const originChannel =
    typeof order.orderingChannel === "string" && order.orderingChannel.length > 0
      ? order.orderingChannel
      : null;

  let sequence = await nextCheckChargeSequence(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );

  if (items.length === 0) {
    const netAmount = computeChargeNetAmount({
      unitPrice: String(order.totalAmount ?? "0.00"),
      quantity: 1,
      lineDiscount: "0.00",
      modifierAmount: "0.00",
    });
    if (parseChargeMoney(netAmount) === 0) return;
    await insertCheckCharge(
      {
        chargeId: `chg_${randomUUID()}`,
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        sequence,
        description: `Order ${order.orderNumber}`,
        quantity: 1,
        unitPrice: String(order.totalAmount ?? "0.00"),
        lineDiscount: "0.00",
        modifierAmount: "0.00",
        netAmount,
        taxCategory: null,
        taxAmount: "0.00",
        currencyCode,
        originOrderId: input.orderId,
        originOrderItemId: null,
        originChannel,
        originReference: `order:${input.orderId}`,
        createdAt,
      },
      client
    );
    return;
  }

  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) continue;
    const unitPrice = String(item.price ?? "0.00");
    const netAmount = computeChargeNetAmount({
      unitPrice,
      quantity,
      lineDiscount: "0.00",
      modifierAmount: "0.00",
    });
    await insertCheckCharge(
      {
        chargeId: `chg_${randomUUID()}`,
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        sequence,
        description: item.nameEn || item.nameAr || `Item ${item.id}`,
        quantity,
        unitPrice,
        lineDiscount: "0.00",
        modifierAmount: "0.00",
        netAmount,
        taxCategory: null,
        taxAmount: "0.00",
        currencyCode,
        originOrderId: input.orderId,
        originOrderItemId: item.id,
        originChannel,
        originReference: `order_item:${item.id}`,
        createdAt,
      },
      client
    );
    sequence += 1;
  }
}

export async function compensateChargesForCancelledOrder(
  input: { restaurantId: number; orderId: number },
  client?: SessionDbClient
): Promise<{ checkId: number | null; compensated: boolean }> {
  const blocking = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId,
    client
  );
  if (!blocking) {
    return { checkId: null, compensated: false };
  }
  if (blocking.checkOutcome !== "open") {
    return { checkId: blocking.membership.checkId, compensated: false };
  }

  const checkId = blocking.membership.checkId;
  assertOpenCheckOutcome(blocking.checkOutcome, "compensate");
  const charges = await listCheckCharges(
    { restaurantId: input.restaurantId, checkId },
    client
  );
  const originCharges = charges.filter(
    (charge) => charge.originOrderId === input.orderId
  );
  if (originCharges.length === 0) {
    return { checkId, compensated: false };
  }
  if (parseChargeMoney(originNetAmount(originCharges, { orderId: input.orderId })) === 0) {
    return { checkId, compensated: false };
  }

  const createdAt = formatDiningSessionTimestamp();
  let sequence = await nextCheckChargeSequence(
    { restaurantId: input.restaurantId, checkId },
    client
  );
  const netByItem = new Map<string, (typeof originCharges)[number][]>();
  for (const charge of originCharges) {
    const key = String(charge.originOrderItemId ?? "order");
    const group = netByItem.get(key) ?? [];
    group.push(charge);
    netByItem.set(key, group);
  }

  for (const group of netByItem.values()) {
    const net = originNetAmount(group, { orderId: input.orderId });
    if (parseChargeMoney(net) === 0) continue;
    const newest = group[group.length - 1];
    const reversal = buildReversalCharge({
      source: {
        ...newest,
        netAmount: net,
        taxAmount: "0.00",
      },
      chargeId: `chg_${randomUUID()}`,
      sequence,
      createdAt,
    });
    await insertCheckCharge(reversal, client);
    sequence += 1;
  }

  return { checkId, compensated: true };
}
