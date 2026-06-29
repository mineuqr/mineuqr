import type { OrderStatus } from "../value-objects/OrderStatus";

/** Guest-safe projection — no internal order id or PII beyond optional customer fields at create. */
export type PublicOrderProjection = {
  orderNumber: string;
  tableNumber: number;
  status: OrderStatus;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
  readyAt: string | null;
};

export type OwnerOrderProjection = PublicOrderProjection & {
  orderId: number;
  restaurantId: number;
  tableId: number;
  sessionId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  trackingToken: string | null;
};

export class OrderVisibilityPolicy {
  static toPublicProjection(input: {
    orderNumber: string;
    tableNumber: number;
    status: OrderStatus;
    totalAmount: string;
    itemCount: number;
    createdAt: string;
    readyAt: string | null;
  }): PublicOrderProjection {
    return {
      orderNumber: input.orderNumber,
      tableNumber: input.tableNumber,
      status: input.status,
      totalAmount: input.totalAmount,
      itemCount: input.itemCount,
      createdAt: input.createdAt,
      readyAt: input.readyAt,
    };
  }
}
