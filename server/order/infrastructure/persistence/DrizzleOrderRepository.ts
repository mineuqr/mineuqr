import {
  createOrder,
  createOrderItems,
  getOrderById,
  getOrderItemsByOrderId,
  markOrderReadyAtIfFirstTransition,
  updateOrderStatus,
} from "../../../db";
import { Order } from "../../domain/aggregate/Order";
import { ConcurrencyConflictError } from "../../domain/errors/OrderDomainErrors";
import type { OrderRepository, SaveOrderResult } from "../../repositories/OrderRepository";
import { mapOrderRowToAggregate } from "./OrderMapper";

export class DrizzleOrderRepository implements OrderRepository {
  async findById(id: number): Promise<Order | null> {
    const row = await getOrderById(id);
    if (!row) return null;
    const items = await getOrderItemsByOrderId(id);
    return mapOrderRowToAggregate(row, items);
  }

  async save(order: Order, expectedUpdatedAt?: string): Promise<SaveOrderResult> {
    if (order.isNew()) {
      return this.insert(order);
    }
    return this.update(order, expectedUpdatedAt);
  }

  private async insert(order: Order): Promise<SaveOrderResult> {
    const props = order.snapshotForCreate();
    const result = await createOrder({
      restaurantId: props.restaurantId,
      tableId: props.tableId,
      tableNumber: props.tableNumber,
      ...(props.sessionId != null ? { sessionId: props.sessionId } : {}),
      customerName: props.customerName,
      customerPhone: props.customerPhone,
      notes: props.notes,
      totalAmount: props.totalAmount,
      orderNumber: props.orderNumber,
      trackingToken: props.trackingToken,
      status: props.status,
    });

    if (!result?.id) {
      throw new Error("Failed to persist order");
    }

    await createOrderItems(
      props.lines.map((line) => ({
        orderId: result.id,
        menuItemId: line.menuItemId,
        nameAr: line.nameAr,
        nameEn: line.nameEn,
        price: line.unitPrice,
        quantity: line.quantity,
        notes: line.notes,
      }))
    );

    const snapshot = order.snapshotForCreate();
    const persisted = Order.reconstitute({
      id: result.id,
      restaurantId: snapshot.restaurantId,
      tableId: snapshot.tableId,
      tableNumber: snapshot.tableNumber,
      sessionId: snapshot.sessionId,
      customerName: snapshot.customerName,
      customerPhone: snapshot.customerPhone,
      notes: snapshot.notes,
      totalAmount: snapshot.totalAmount,
      orderNumber: snapshot.orderNumber,
      trackingToken: snapshot.trackingToken,
      createdAt: order.createdAt,
      updatedAt: order.createdAt,
      status: snapshot.status,
      readyAt: null,
      lines: snapshot.lines,
    });
    return { order: persisted };
  }

  private async update(
    order: Order,
    expectedUpdatedAt?: string
  ): Promise<SaveOrderResult> {
    const id = order.id;
    if (id == null) {
      throw new Error("Order id required for update");
    }

    const current = await getOrderById(id);
    if (!current) {
      throw new Error("Order not found");
    }

    if (expectedUpdatedAt != null && current.updatedAt !== expectedUpdatedAt) {
      throw new ConcurrencyConflictError();
    }

    const previousStatus = current.status;
    const newStatus = order.status;

    await markOrderReadyAtIfFirstTransition(id, previousStatus, newStatus);
    await updateOrderStatus(id, newStatus);

    return {
      order: Order.reconstitute({
        ...order.toPersistedProps(),
      }),
    };
  }
}
