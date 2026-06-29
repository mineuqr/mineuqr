import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { orders, orderItems } from "../../../../drizzle/schema";
import { Order } from "../../domain/aggregate/Order";
import { ConcurrencyConflictError } from "../../domain/errors/OrderDomainErrors";
import type {
  OrderRepository,
  SaveOrderOptions,
  SaveOrderResult,
} from "../../repositories/OrderRepository";
import { mapOrderRowToAggregate } from "./OrderMapper";
import {
  createOrder,
  createOrderItems,
  getOrderById,
  getOrderItemsByOrderId,
  markOrderReadyAtIfFirstTransition,
  updateOrderStatus,
} from "../../../db";
import { DrizzleOutboxRepository } from "../events/outbox/DrizzleOutboxRepository";
import { domainEventsToOutboxInputs } from "../events/outbox/domainEventsToOutbox";

export class DrizzleOrderRepository implements OrderRepository {
  constructor(private readonly outbox = new DrizzleOutboxRepository()) {}

  async findById(id: number): Promise<Order | null> {
    const row = await getOrderById(id);
    if (!row) return null;
    const items = await getOrderItemsByOrderId(id);
    return mapOrderRowToAggregate(row, items);
  }

  async save(order: Order, options?: SaveOrderOptions): Promise<SaveOrderResult> {
    let db: Awaited<ReturnType<typeof getDb>> = null;
    try {
      db = await getDb();
    } catch {
      db = null;
    }

    if (db) {
      try {
        return await db.transaction(async (tx) =>
          order.isNew()
            ? this.insertTransactional(tx, order, options)
            : this.updateTransactional(tx, order, options)
        );
      } catch (error) {
        console.warn("[OrderRepository] Transactional save failed, falling back:", error);
      }
    }
    return order.isNew()
      ? this.insertLegacy(order, options)
      : this.updateLegacy(order, options);
  }

  private async insertTransactional(
    tx: Parameters<Parameters<NonNullable<Awaited<ReturnType<typeof getDb>>>["transaction"]>[0]>[0],
    order: Order,
    options?: SaveOrderOptions
  ): Promise<SaveOrderResult> {
    const snapshot = order.snapshotForCreate();
    const insertResult = await tx.insert(orders).values({
      restaurantId: snapshot.restaurantId,
      tableId: snapshot.tableId,
      tableNumber: snapshot.tableNumber,
      ...(snapshot.sessionId != null ? { sessionId: snapshot.sessionId } : {}),
      customerName: snapshot.customerName,
      customerPhone: snapshot.customerPhone,
      notes: snapshot.notes,
      totalAmount: snapshot.totalAmount,
      orderNumber: snapshot.orderNumber,
      trackingToken: snapshot.trackingToken,
      status: snapshot.status,
    });

    const orderId = Number(insertResult[0].insertId);
    if (!orderId) {
      throw new Error("Failed to persist order");
    }

    await tx.insert(orderItems).values(
      snapshot.lines.map((line) => ({
        orderId,
        menuItemId: line.menuItemId,
        nameAr: line.nameAr,
        nameEn: line.nameEn,
        price: line.unitPrice,
        quantity: line.quantity,
        notes: line.notes,
      }))
    );

    const persisted = Order.reconstitute({
      id: orderId,
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

    const events =
      options?.onPersisted?.(persisted) ?? options?.domainEvents ?? [];

    const outboxInputs = domainEventsToOutboxInputs(events, {
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      restaurantId: persisted.restaurantId,
    });

    await this.outbox.appendInTransaction(tx, outboxInputs);

    return {
      order: persisted,
      outboxEventIds: outboxInputs.map((m) => m.envelope.eventId),
    };
  }

  private async updateTransactional(
    tx: Parameters<Parameters<NonNullable<Awaited<ReturnType<typeof getDb>>>["transaction"]>[0]>[0],
    order: Order,
    options?: SaveOrderOptions
  ): Promise<SaveOrderResult> {
    const id = order.id;
    if (id == null) {
      throw new Error("Order id required for update");
    }

    const [current] = await tx.select().from(orders).where(eq(orders.id, id));
    if (!current) {
      throw new Error("Order not found");
    }

    if (
      options?.expectedUpdatedAt != null &&
      current.updatedAt !== options.expectedUpdatedAt
    ) {
      throw new ConcurrencyConflictError();
    }

    const previousStatus = current.status;
    const newStatus = order.status;

    if (previousStatus !== "ready" && newStatus === "ready" && !current.readyAt) {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await tx
        .update(orders)
        .set({ readyAt: now })
        .where(and(eq(orders.id, id), eq(orders.readyAt, null as unknown as string)));
    }

    await tx.update(orders).set({ status: newStatus }).where(eq(orders.id, id));

    const events = options?.domainEvents ?? [];
    const outboxInputs = domainEventsToOutboxInputs(events, {
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      restaurantId: order.restaurantId,
    });
    await this.outbox.appendInTransaction(tx, outboxInputs);

    return {
      order: Order.reconstitute({
        ...order.toPersistedProps(),
      }),
      outboxEventIds: outboxInputs.map((m) => m.envelope.eventId),
    };
  }

  private async insertLegacy(
    order: Order,
    options?: SaveOrderOptions
  ): Promise<SaveOrderResult> {
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

    options?.onPersisted?.(persisted);

    return { order: persisted, outboxEventIds: [] };
  }

  private async updateLegacy(
    order: Order,
    options?: SaveOrderOptions
  ): Promise<SaveOrderResult> {
    const id = order.id;
    if (id == null) {
      throw new Error("Order id required for update");
    }

    const current = await getOrderById(id);
    if (!current) {
      throw new Error("Order not found");
    }

    if (
      options?.expectedUpdatedAt != null &&
      current.updatedAt !== options.expectedUpdatedAt
    ) {
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
      outboxEventIds: [],
    };
  }
}
