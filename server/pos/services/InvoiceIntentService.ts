/**
 * UNIFIED-POS-FINANCIAL-AUTHORITY-1 / CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 * Builds Invoice Intent from operational Order. Does not write Collection Fact.
 * Awaiting Cashier membership requires an explicit Cashier Handoff.
 */
import { getOrderById, getOrderItemsByOrderId } from "../../db";
import { resolveOrderDisplayIdentity } from "../../order/business-identity/application/OrderDisplayIdentityResolver";
import { findProductionCollectionFactByOrderId } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import {
  isCashierFinalizableOrderingChannel,
  isCashierHandoffEligibleOrderingChannel,
  type InvoiceIntent,
  type InvoiceIntentLine,
} from "@shared/pos";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import {
  hasCashierHandoff,
  listCashierHandoffsByRestaurant,
} from "../cashier-handoff/cashierHandoffRepository";

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
  handedOff?: boolean;
}): Promise<InvoiceIntent | null> {
  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) return null;
  if (!isCashierFinalizableOrderingChannel(order.orderingChannel)) return null;
  if (order.status === "cancelled") return null;
  const fact = await findProductionCollectionFactByOrderId({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
  });
  const handedOff =
    input.handedOff ??
    (await hasCashierHandoff({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
    }));
  if (!fact && !handedOff) return null;
  if (
    !fact &&
    (order.orderingChannel === ORDERING_CHANNEL_CASHIER_POS ||
      !isCashierHandoffEligibleOrderingChannel(order.orderingChannel))
  ) {
    return null;
  }
  const items = mapIntentLines(await getOrderItemsByOrderId(input.orderId));
  const total = String(order.totalAmount ?? "0.00");
  const orderNumber = order.orderNumber?.trim() || String(order.id);
  const identity = resolveOrderDisplayIdentity({
    orderNumber,
    businessDay: order.businessDay ?? null,
    dailyDisplayNumber: order.dailyDisplayNumber ?? null,
    identityScope: order.identityScope ?? null,
    fulfilmentAnchorType: order.fulfilmentAnchorType ?? null,
    serviceMode: order.serviceMode ?? null,
  });
  const tableNumber =
    typeof order.tableNumber === "number" && order.tableNumber > 0
      ? order.tableNumber
      : null;
  return {
    invoiceIntentId: invoiceIntentIdForOrder(input.restaurantId, input.orderId),
    restaurantId: input.restaurantId,
    sourceChannel: order.orderingChannel ?? "unspecified",
    sessionId: order.sessionId ?? null,
    orderId: order.id,
    orderNumber,
    displayReference: identity.displayReference,
    displayOrderNumber: identity.displayOrderNumber,
    tableNumber,
    orderStatus: order.status,
    items,
    expectedSubtotal: total,
    expectedGrandTotal: total,
    status: fact ? "financially_settled" : "awaiting_cashier",
  };
}

/** Awaiting Cashier only. Membership is Cashier Handoff, not missing Collection Fact. */
export async function listAwaitingInvoiceIntents(input: {
  restaurantId: number;
  limit?: number;
}): Promise<InvoiceIntent[]> {
  const cap = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const handoffs = await listCashierHandoffsByRestaurant(input.restaurantId);
  const awaiting: InvoiceIntent[] = [];
  for (const handoff of handoffs) {
    if (awaiting.length >= cap) break;
    const intent = await buildInvoiceIntentForOrder({
      restaurantId: input.restaurantId,
      orderId: handoff.orderId,
      handedOff: true,
    });
    if (intent?.status === "awaiting_cashier") awaiting.push(intent);
  }
  return awaiting;
}
