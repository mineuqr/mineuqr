/**
 * UNIFIED-POS-FINANCIAL-AUTHORITY-1
 * Builds Invoice Intent from operational Order. Does not write Collection Fact.
 */
import { getOrderById, getOrderItemsByOrderId, getOrdersByRestaurant } from "../../db";
import { findProductionCollectionFactByOrderId } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import type { InvoiceIntent, InvoiceIntentLine } from "@shared/pos";
import { isCashierFinalizableOrderingChannel } from "@shared/pos";

export function invoiceIntentIdForOrder(
  restaurantId: number,
  orderId: number
): string {
  return `ii:${restaurantId}:${orderId}`;
}

function lineTotal(unitPrice: string, quantity: number): string {
  const match = String(unitPrice).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match || !Number.isInteger(quantity) || quantity < 0) {
    return String(unitPrice);
  }
  const unitCents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  const cents = unitCents * quantity;
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function mapIntentLines(
  items: Awaited<ReturnType<typeof getOrderItemsByOrderId>>
): InvoiceIntentLine[] {
  return items.map((item) => {
    const unit = String(item.price ?? "0.00");
    return {
      menuItemId: item.menuItemId > 0 ? item.menuItemId : null,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      quantity: item.quantity,
      unitPrice: unit,
      lineTotal: lineTotal(unit, item.quantity),
    };
  });
}

export async function buildInvoiceIntentForOrder(input: {
  restaurantId: number;
  orderId: number;
}): Promise<InvoiceIntent | null> {
  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) return null;
  if (!isCashierFinalizableOrderingChannel(order.orderingChannel)) return null;
  if (order.status === "cancelled") return null;
  const fact = await findProductionCollectionFactByOrderId({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
  });
  const items = mapIntentLines(await getOrderItemsByOrderId(input.orderId));
  const total = String(order.totalAmount ?? "0.00");
  return {
    invoiceIntentId: invoiceIntentIdForOrder(input.restaurantId, input.orderId),
    restaurantId: input.restaurantId,
    sourceChannel: order.orderingChannel ?? "unspecified",
    sessionId: order.sessionId ?? null,
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    items,
    expectedSubtotal: total,
    expectedGrandTotal: total,
    status: fact ? "financially_settled" : "awaiting_cashier",
  };
}

/** Awaiting Cashier only. Not Collection Fact. Not PAID. */
export async function listAwaitingInvoiceIntents(input: {
  restaurantId: number;
  limit?: number;
}): Promise<InvoiceIntent[]> {
  const cap = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const orders = await getOrdersByRestaurant(input.restaurantId);
  const awaiting: InvoiceIntent[] = [];
  for (const order of orders) {
    if (awaiting.length >= cap) break;
    if (order.status === "cancelled") continue;
    if (!isCashierFinalizableOrderingChannel(order.orderingChannel)) continue;
    const fact = await findProductionCollectionFactByOrderId({
      restaurantId: input.restaurantId,
      orderId: order.id,
    });
    if (fact) continue;
    const intent = await buildInvoiceIntentForOrder({
      restaurantId: input.restaurantId,
      orderId: order.id,
    });
    if (intent?.status === "awaiting_cashier") awaiting.push(intent);
  }
  return awaiting;
}
