import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  requireRestaurantRowForOrderPersist,
} from "../../../db/restaurantRowLock";
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
import type { DrizzleBusinessIdentityAllocator } from "../../business-identity/infrastructure/DrizzleBusinessIdentityAllocator";
import {
  BUSINESS_IDENTITY_RETRY_POLICY,
  computeBusinessIdentityRetryDelayMs,
  sleepMs,
} from "../../business-identity/config/businessIdentityRetryPolicy";
import {
  classifyBusinessIdentityInfrastructureError,
  isRetryableBusinessIdentityInfrastructureError,
} from "../../business-identity/infrastructure/mysqlInfrastructureErrors";
import {
  logBusinessIdentityAssignmentRetry,
  logBusinessIdentityDeadlock,
  logBusinessIdentityUniqueConstraintRetry,
} from "../../business-identity/observability/businessIdentityObservability";
import { businessIdentityMetrics } from "../../business-identity/observability/BusinessIdentityMetrics";
import {
  noteOrderLifecyclePhase,
  timeOrderLifecyclePhase,
} from "../../observability/orderLifecycleLatency";
import { orderLifecycleNowMs } from "@shared/order-lifecycle-latency";

export class DrizzleOrderRepository implements OrderRepository {
  constructor(
    private readonly outbox = new DrizzleOutboxRepository(),
    private readonly businessIdentityAllocator?: DrizzleBusinessIdentityAllocator
  ) {}

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

    const requireSameTransactionCompanion = options?.afterPersistInTransaction != null;

    if (db) {
      const { maxAttempts } = BUSINESS_IDENTITY_RETRY_POLICY;
      const attempts = requireSameTransactionCompanion ? 1 : maxAttempts;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const isNew = order.isNew();
          let commitStarted = 0;
          const result = await db.transaction(async (tx) => {
            const saved = isNew
              ? await this.insertTransactional(tx, order, options)
              : await this.updateTransactional(tx, order, options);
            if (options?.afterPersistInTransaction) {
              await options.afterPersistInTransaction(tx, saved);
            }
            if (isNew) {
              commitStarted = orderLifecycleNowMs();
            }
            return saved;
          });
          if (isNew && commitStarted > 0) {
            noteOrderLifecyclePhase(
              "commit_ms",
              orderLifecycleNowMs() - commitStarted
            );
          }
          return result;
        } catch (error) {
          if (requireSameTransactionCompanion) {
            throw error;
          }
          const retryable =
            isRetryableBusinessIdentityInfrastructureError(error) && attempt < maxAttempts;
          if (retryable) {
            const kind = classifyBusinessIdentityInfrastructureError(error);
            businessIdentityMetrics.recordRetry();
            if (kind === "deadlock") {
              businessIdentityMetrics.recordDeadlock();
              logBusinessIdentityDeadlock({
                orderId: order.id ?? undefined,
                restaurantId: order.restaurantId,
                attempt,
                path: "hot",
                correlationId: options?.correlationId ?? undefined,
                error: error instanceof Error ? error.message : String(error),
              });
            } else if (kind === "unique_violation") {
              businessIdentityMetrics.recordUniqueConstraintRetry();
              logBusinessIdentityUniqueConstraintRetry({
                orderId: order.id ?? undefined,
                restaurantId: order.restaurantId,
                attempt,
                path: "hot",
                correlationId: options?.correlationId ?? undefined,
                error: error instanceof Error ? error.message : String(error),
              });
            }
            logBusinessIdentityAssignmentRetry({
              orderId: order.id ?? undefined,
              restaurantId: order.restaurantId,
              attempt,
              path: "hot",
              correlationId: options?.correlationId ?? undefined,
              errorKind: kind,
              error: error instanceof Error ? error.message : String(error),
            });
            await sleepMs(computeBusinessIdentityRetryDelayMs(attempt));
            continue;
          }
          console.warn("[OrderRepository] Transactional save failed, falling back:", error);
          break;
        }
      }
    }
    if (requireSameTransactionCompanion) {
      throw new Error("database_unavailable");
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
    const persistStarted = orderLifecycleNowMs();
    const snapshot = order.snapshotForCreate();
    const createStatus = options?.createRowStatus ?? snapshot.status;
    // POS-SALE-PERSISTENCE-INTERNAL-INSTRUMENTATION-1 — wrap existing ops only.
    const lockedRestaurant = await timeOrderLifecyclePhase("restaurant_lock_ms", () =>
      requireRestaurantRowForOrderPersist(tx, snapshot.restaurantId)
    );

    let businessIdentity: SaveOrderResult["businessIdentity"];
    if (this.businessIdentityAllocator && !options?.skipBusinessIdentityAllocation) {
      const assignment = await this.businessIdentityAllocator.allocateForNewOrder(
        tx,
        {
          restaurantId: snapshot.restaurantId,
          createdAt: order.createdAt,
          workingHours: lockedRestaurant.workingHours,
          fulfilmentAnchorType: snapshot.fulfilmentAnchorType,
          serviceMode: snapshot.serviceMode,
          identityScope: (options?.identityScope ?? undefined) as
            | import("../../business-identity/types").BusinessIdentityScope
            | undefined,
        }
      );
      businessIdentity = {
        businessDay: assignment.businessDay,
        dailyDisplayNumber: assignment.dailyDisplayNumber,
        identityScope: assignment.identityScope,
      };
    }

    const insertResult = await timeOrderLifecyclePhase("order_insert_ms", () =>
      tx.insert(orders).values({
        restaurantId: snapshot.restaurantId,
        tableId: snapshot.tableId,
        tableNumber: snapshot.tableNumber,
        ...(snapshot.sessionId != null ? { sessionId: snapshot.sessionId } : {}),
        serviceMode: snapshot.serviceMode,
        fulfilmentAnchorType: snapshot.fulfilmentAnchorType,
        fulfilmentLabel: snapshot.fulfilmentLabel,
        customerName: snapshot.customerName,
        customerPhone: snapshot.customerPhone,
        notes: snapshot.notes,
        totalAmount: snapshot.totalAmount,
        orderNumber: snapshot.orderNumber,
        trackingToken: snapshot.trackingToken,
        status: createStatus,
        lifecycleStage: snapshot.lifecycleStage,
        ...(businessIdentity != null
          ? {
              businessDay: businessIdentity.businessDay,
              dailyDisplayNumber: businessIdentity.dailyDisplayNumber,
              identityScope: businessIdentity.identityScope,
            }
          : {}),
        ...(options?.orderingChannel != null
          ? { orderingChannel: options.orderingChannel }
          : {}),
      })
    );

    const orderId = Number(insertResult[0].insertId);
    if (!orderId) {
      throw new Error("Failed to persist order");
    }

    await timeOrderLifecyclePhase("order_lines_ms", () =>
      tx.insert(orderItems).values(
        snapshot.lines.map((line) => ({
          orderId,
          menuItemId: line.menuItemId,
          nameAr: line.nameAr,
          nameEn: line.nameEn,
          price: line.unitPrice,
          quantity: line.quantity,
          notes: line.notes,
          modifiers: [...(line.modifiers ?? [])],
        }))
      )
    );

    const persisted = Order.reconstitute({
      id: orderId,
      restaurantId: snapshot.restaurantId,
      tableId: snapshot.tableId,
      tableNumber: snapshot.tableNumber,
      sessionId: snapshot.sessionId,
      serviceMode: snapshot.serviceMode,
      fulfilmentAnchorType: snapshot.fulfilmentAnchorType,
      fulfilmentLabel: snapshot.fulfilmentLabel,
      customerName: snapshot.customerName,
      customerPhone: snapshot.customerPhone,
      notes: snapshot.notes,
      totalAmount: snapshot.totalAmount,
      orderNumber: snapshot.orderNumber,
      trackingToken: snapshot.trackingToken,
      createdAt: order.createdAt,
      updatedAt: order.createdAt,
      status: snapshot.status,
      lifecycleStage: snapshot.lifecycleStage,
      readyAt: null,
      lines: snapshot.lines,
    });

    const events =
      options?.onPersisted?.(persisted) ?? options?.domainEvents ?? [];

    if (
      persisted.status !== createStatus ||
      persisted.lifecycleStage !== snapshot.lifecycleStage
    ) {
      await timeOrderLifecyclePhase("accept_update_ms", () =>
        tx
          .update(orders)
          .set({
            status: persisted.status,
            lifecycleStage: persisted.lifecycleStage,
          })
          .where(eq(orders.id, orderId))
      );
    } else {
      noteOrderLifecyclePhase("accept_update_ms", 0);
    }

    const outboxInputs = domainEventsToOutboxInputs(events, {
      correlationId: options?.correlationId ?? undefined,
      causationId: options?.causationId,
      restaurantId: persisted.restaurantId,
    });

    noteOrderLifecyclePhase("persist_ms", orderLifecycleNowMs() - persistStarted);
    const outboxStarted = orderLifecycleNowMs();
    await this.outbox.appendInTransaction(tx, outboxInputs);
    noteOrderLifecyclePhase("outbox_ms", orderLifecycleNowMs() - outboxStarted);

    return {
      order: persisted,
      outboxEventIds: outboxInputs.map((m) => m.envelope.eventId),
      businessIdentity,
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

    await tx.update(orders).set({
      status: newStatus,
      lifecycleStage: order.lifecycleStage,
    }).where(eq(orders.id, id));

    const events = options?.domainEvents ?? [];
    const outboxInputs = domainEventsToOutboxInputs(events, {
      correlationId: options?.correlationId ?? undefined,
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
      serviceMode: props.serviceMode,
      fulfilmentAnchorType: props.fulfilmentAnchorType,
      fulfilmentLabel: props.fulfilmentLabel,
      customerName: props.customerName,
      customerPhone: props.customerPhone,
      notes: props.notes,
      totalAmount: props.totalAmount,
      orderNumber: props.orderNumber,
      trackingToken: props.trackingToken,
      status: props.status,
      ...(options?.orderingChannel != null
        ? { orderingChannel: options.orderingChannel }
        : {}),
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
        modifiers: [...(line.modifiers ?? [])],
      }))
    );

    const snapshot = order.snapshotForCreate();
    const persisted = Order.reconstitute({
      id: result.id,
      restaurantId: snapshot.restaurantId,
      tableId: snapshot.tableId,
      tableNumber: snapshot.tableNumber,
      sessionId: snapshot.sessionId,
      serviceMode: snapshot.serviceMode,
      fulfilmentAnchorType: snapshot.fulfilmentAnchorType,
      fulfilmentLabel: snapshot.fulfilmentLabel,
      customerName: snapshot.customerName,
      customerPhone: snapshot.customerPhone,
      notes: snapshot.notes,
      totalAmount: snapshot.totalAmount,
      orderNumber: snapshot.orderNumber,
      trackingToken: snapshot.trackingToken,
      createdAt: order.createdAt,
      updatedAt: order.createdAt,
      status: snapshot.status,
      lifecycleStage: snapshot.lifecycleStage,
      readyAt: null,
      lines: snapshot.lines,
    });

    options?.onPersisted?.(persisted);

    if (persisted.status !== snapshot.status && persisted.id != null) {
      await updateOrderStatus(persisted.id, persisted.status);
    }

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
