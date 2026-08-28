/**
 * CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 *
 * Channel policy:
 * - table_session / waiter_tablet: explicit session Send (open session).
 * - qr / kiosk: explicit order Send (Orders workspace). No auto-handoff on place
 *   or operational completion — existing staff Send is the trigger.
 * - cashier_pos: never self-enqueues; direct Cashier sales stay off Incoming.
 * - marketplace / mobile / unspecified: unsupported.
 *
 * Operational eligibility reuses existing states: not cancelled, session open
 * for table/waiter Send. Does not invent a new Order status. Does not require
 * served (existing Send is available on any open session).
 *
 * Does not write Collection Fact, PAID, Check, ST/OS/SR, or a second Order.
 */
import { getOrderById, getOrdersBySessionId } from "../../db";
import { findSessionById } from "../../diningSession/sessionRepository";
import { findProductionCollectionFactByOrderId } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import {
  isCashierHandoffEligibleOrderingChannel,
} from "@shared/pos";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { CashierHandoffError } from "./cashierHandoffErrors";
import { insertCashierHandoffIgnoreDuplicate } from "./cashierHandoffRepository";

function assertIds(restaurantId: number, orderOrSessionId: number, field: string): void {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new CashierHandoffError("Invalid restaurantId");
  }
  if (!Number.isInteger(orderOrSessionId) || orderOrSessionId <= 0) {
    throw new CashierHandoffError(`Invalid ${field}`);
  }
}

async function assertEligibleForHandoff(order: {
  id: number;
  restaurantId: number;
  status: string;
  orderingChannel: string | null;
}): Promise<void> {
  if (order.status === "cancelled") {
    throw new CashierHandoffError("Cancelled orders cannot be sent to Cashier");
  }
  if (order.orderingChannel === ORDERING_CHANNEL_CASHIER_POS) {
    throw new CashierHandoffError(
      "Direct Cashier sales are not Incoming Queue items"
    );
  }
  if (!isCashierHandoffEligibleOrderingChannel(order.orderingChannel)) {
    throw new CashierHandoffError("Order channel cannot be sent to Cashier");
  }
  const fact = await findProductionCollectionFactByOrderId({
    restaurantId: order.restaurantId,
    orderId: order.id,
  });
  if (fact) {
    throw new CashierHandoffError("Order is already paid at Cashier");
  }
}

export async function activateCashierHandoffForOrder(input: {
  restaurantId: number;
  orderId: number;
}): Promise<{ restaurantId: number; orderId: number }> {
  assertIds(input.restaurantId, input.orderId, "orderId");
  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new CashierHandoffError("Order not found");
  }
  await assertEligibleForHandoff(order);
  await insertCashierHandoffIgnoreDuplicate({
    restaurantId: input.restaurantId,
    orderId: order.id,
    sourceChannel: order.orderingChannel ?? "unspecified",
    sessionId: order.sessionId ?? null,
  });
  return { restaurantId: input.restaurantId, orderId: order.id };
}

export async function activateCashierHandoffForSession(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<{ restaurantId: number; sessionId: number; orderIds: number[] }> {
  assertIds(input.restaurantId, input.sessionId, "sessionId");
  const session = await findSessionById(input.sessionId);
  if (!session || session.restaurantId !== input.restaurantId) {
    throw new CashierHandoffError("Session not found");
  }
  if (session.status !== "open") {
    throw new CashierHandoffError("Session is not open");
  }
  const linked = await getOrdersBySessionId(input.restaurantId, input.sessionId);
  const orderIds: number[] = [];
  // Eligibility fields come from the session membership query. Production CF
  // remains a separate required read (not present on `orders`).
  for (const order of linked) {
    if (order.restaurantId !== input.restaurantId) continue;
    if (order.status === "cancelled") continue;
    if (order.orderingChannel === ORDERING_CHANNEL_CASHIER_POS) continue;
    if (!isCashierHandoffEligibleOrderingChannel(order.orderingChannel)) continue;
    const fact = await findProductionCollectionFactByOrderId({
      restaurantId: input.restaurantId,
      orderId: order.id,
    });
    if (fact) continue;
    await insertCashierHandoffIgnoreDuplicate({
      restaurantId: input.restaurantId,
      orderId: order.id,
      sourceChannel: order.orderingChannel || "unspecified",
      sessionId: order.sessionId ?? input.sessionId,
    });
    orderIds.push(order.id);
  }
  if (orderIds.length === 0) {
    throw new CashierHandoffError("No eligible orders to send to Cashier");
  }
  return {
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    orderIds,
  };
}
