/**
 * THERMAL-PRINTING-4A — kitchen ticket renderer (presentation-independent).
 */
import type { SelectOrderItem } from "../../drizzle/schema";
import { getOrderById, getOrderItemsByOrderId } from "../db";
import {
  KITCHEN_TICKET_TYPE,
  KitchenTicketEmptyItemsError,
  KitchenTicketOrderNotFoundError,
  type KitchenTicket,
  type KitchenTicketItem,
  type RenderKitchenTicketInput,
} from "./ticketTypes";

function parseKitchenTicketCreatedAt(value: string): Date {
  const trimmed = value.trim();
  if (trimmed.includes("T")) {
    return new Date(trimmed);
  }
  return new Date(`${trimmed.replace(" ", "T")}Z`);
}

function resolveItemName(item: SelectOrderItem): string {
  const nameAr = item.nameAr?.trim();
  if (nameAr) return nameAr;
  const nameEn = item.nameEn?.trim();
  if (nameEn) return nameEn;
  return "Item";
}

function mapOrderItem(item: SelectOrderItem): KitchenTicketItem {
  return {
    itemName: resolveItemName(item),
    quantity: item.quantity,
    notes: item.notes?.trim() ? item.notes.trim() : null,
  };
}

function sortItemsDeterministically(items: SelectOrderItem[]): SelectOrderItem[] {
  return [...items].sort((left, right) => {
    if (left.id !== right.id) return left.id - right.id;
    return left.menuItemId - right.menuItemId;
  });
}

export async function renderKitchenTicket(
  input: RenderKitchenTicketInput
): Promise<KitchenTicket> {
  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    throw new KitchenTicketOrderNotFoundError("Invalid orderId");
  }

  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new KitchenTicketOrderNotFoundError();
  }

  const orderItems = await getOrderItemsByOrderId(input.orderId);
  if (orderItems.length === 0) {
    throw new KitchenTicketEmptyItemsError();
  }

  const items = sortItemsDeterministically(orderItems).map(mapOrderItem);

  return {
    ticketType: KITCHEN_TICKET_TYPE.KITCHEN_ORDER,
    restaurantId: order.restaurantId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber != null ? String(order.tableNumber) : null,
    sessionId: order.sessionId ?? null,
    createdAt: parseKitchenTicketCreatedAt(order.createdAt),
    notes: order.notes?.trim() ? order.notes.trim() : null,
    items,
  };
}
