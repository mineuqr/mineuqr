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
import { getOrderById, getOrderItemsByOrderId } from "../../../db";
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
import {
  logOrderCreatePersistenceFailed,
  logOrderUpdatePersistenceFailed,
} from "../../observability/orderCreatePersistenceObservability";
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
    // ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 — a create commits Order +
    // Order Items + OrderCreated Outbox in one transaction, or nothing. There is
    // no non-transactional create path, so a failed create must fail closed.
    const isNewOrder = order.isNew();

    if (db) {
      const { maxAttempts } = BUSINESS_IDENTITY_RETRY_POLICY;
      const attempts = requireSameTransactionCompanion ? 1 : maxAttempts;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          let commitStarted = 0;
          const result = await db.transaction(async (tx) => {
            const saved = isNewOrder
              ? await this.insertTransactional(tx, order, options)
              : await this.updateTransactional(tx, order, options);
            if (options?.afterPersistInTransaction) {
              await options.afterPersistInTransaction(tx, saved);
            }
            if (isNewOrder) {
              commitStarted = orderLifecycleNowMs();
            }
            return saved;
          });
          if (isNewOrder && commitStarted > 0) {
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
          if (isNewOrder) {
            logOrderCreatePersistenceFailed({
              restaurantId: order.restaurantId,
              orderingChannel: options?.orderingChannel ?? undefined,
              correlationId: options?.correlationId ?? undefined,
              reason: "transaction_failed",
              attempts: attempt,
              error: error instanceof Error ? error.message : String(error),
            });
          } else {
            logOrderUpdatePersistenceFailed({
              orderId: order.id ?? undefined,
              restaurantId: order.restaurantId,
              correlationId: options?.correlationId ?? undefined,
              reason: "transaction_failed",
              attempts: attempt,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          throw error;
        }
      }
    }
    if (requireSameTransactionCompanion) {
      throw new Error("database_unavailable");
    }
    if (isNewOrder) {
      logOrderCreatePersistenceFailed({
        restaurantId: order.restaurantId,
        orderingChannel: options?.orderingChannel ?? undefined,
        correlationId: options?.correlationId ?? undefined,
        reason: "database_unavailable",
      });
    } else {
      logOrderUpdatePersistenceFailed({
        orderId: order.id ?? undefined,
        restaurantId: order.restaurantId,
        correlationId: options?.correlationId ?? undefined,
        reason: "database_unavailable",
      });
    }
    throw new Error("database_unavailable");
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

    // FIRST-ORDER-SESSION-CREATE-FAIL-CLOSED-HARDENING-1 — resolve/open the
    // Operational Session inside this transaction, after the restaurant row lock
    // (which already serializes order persist per restaurant) and before the
    // Order row exists. A failure anywhere below rolls the Session opening back.
    let resolvedSessionId = snapshot.sessionId;
    if (options?.resolveSessionInTransaction) {
      const resolved = await timeOrderLifecyclePhase("session_ms", () =>
        options.resolveSessionInTransaction!(tx)
      );
      if (resolved?.sessionId != null) {
        resolvedSessionId = resolved.sessionId;
      }
    }

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
        ...(resolvedSessionId != null ? { sessionId: resolvedSessionId } : {}),
        serviceMode: snapshot.serviceMode,
        fulfilmentAnchorType: snapshot.fulfilmentAnchorType,
        fulfilmentLabel: snapshot.fulfilmentLabel,
        customerName: snapshot.customerName,
        customerPhone: snapshot.customerPhone,
        customerId: snapshot.customerId ?? null,
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
      sessionId: resolvedSessionId,
      serviceMode: snapshot.serviceMode,
      fulfilmentAnchorType: snapshot.fulfilmentAnchorType,
      fulfilmentLabel: snapshot.fulfilmentLabel,
      customerName: snapshot.customerName,
      customerPhone: snapshot.customerPhone,
      customerId: snapshot.customerId ?? null,
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

}
