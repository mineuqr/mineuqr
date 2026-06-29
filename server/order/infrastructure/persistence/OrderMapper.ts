import type { SelectOrder, SelectOrderItem } from "../../../../drizzle/schema";
import { Order } from "../../domain/aggregate/Order";
import { assertOrderStatus } from "../../domain/value-objects/OrderStatus";

export function mapOrderRowToAggregate(
  order: SelectOrder,
  items: SelectOrderItem[]
): Order {
  return Order.reconstitute({
    id: order.id,
    restaurantId: order.restaurantId,
    tableId: order.tableId,
    tableNumber: order.tableNumber,
    sessionId: order.sessionId ?? null,
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    notes: order.notes ?? null,
    totalAmount: String(order.totalAmount),
    orderNumber: order.orderNumber,
    trackingToken: order.trackingToken ?? "",
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: assertOrderStatus(order.status),
    readyAt: order.readyAt ?? null,
    lines: items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? null,
      unitPrice: String(item.price),
      quantity: item.quantity,
      notes: item.notes ?? null,
    })),
  });
}
