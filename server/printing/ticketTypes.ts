/**
 * THERMAL-PRINTING-4A — printer-agnostic kitchen ticket domain model.
 */

export const KITCHEN_TICKET_TYPE = {
  KITCHEN_ORDER: "kitchen-order",
} as const;

export type KitchenTicketType =
  (typeof KITCHEN_TICKET_TYPE)[keyof typeof KITCHEN_TICKET_TYPE];

export interface KitchenTicketItem {
  itemName: string;
  quantity: number;
  notes: string | null;
}

export interface KitchenTicket {
  ticketType: KitchenTicketType;
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  tableNumber: string | null;
  sessionId: number | null;
  createdAt: Date;
  notes: string | null;
  items: KitchenTicketItem[];
}

export class KitchenTicketOrderNotFoundError extends Error {
  constructor(message = "Order not found") {
    super(message);
    this.name = "KitchenTicketOrderNotFoundError";
  }
}

export class KitchenTicketEmptyItemsError extends Error {
  constructor(message = "Order has no items") {
    super(message);
    this.name = "KitchenTicketEmptyItemsError";
  }
}

export type RenderKitchenTicketInput = {
  orderId: number;
};
