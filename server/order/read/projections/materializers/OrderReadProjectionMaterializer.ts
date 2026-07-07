import type { EventEnvelope } from "../../../infrastructure/events/EventEnvelope";
import type { OrderDomainEvent } from "../../../domain/events/OrderDomainEvents";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../../domain/contracts/projectionIds";
import type {
  ActiveOrderProjectionRecord,
  OrderDetailProjectionRecord,
  OrderReadProjectionRepositories,
} from "../../infrastructure/persistence/contracts/ProjectionRepositoryContracts";
import type { OrderReadContextLoader } from "../../infrastructure/persistence/OrderReadContextLoader";
import { drizzleCategoryResolutionPort } from "../../infrastructure/persistence/DrizzleCategoryResolutionPort";
import { InMemoryOrderReadProjectionStore } from "../../infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import { OrderCategoryProjectionBuilder } from "../builders/OrderCategoryProjectionBuilder";
import { OrderReadLineItemProjectionBuilder } from "../builders/OrderReadLineItemProjectionBuilder";
import {
  dayKeyFromTimestamp,
  isActiveOrderStatus,
  statusBucket,
} from "./projectionStatus";

function parsePayload(envelope: EventEnvelope): OrderDomainEvent {
  return envelope.payload as OrderDomainEvent;
}

function addDecimal(a: string, b: string): string {
  return (Number(a) + Number(b)).toFixed(2);
}

export class OrderReadProjectionMaterializer {
  constructor(
    private readonly repos: OrderReadProjectionRepositories,
    private readonly contextLoader: OrderReadContextLoader,
    private readonly recordBuilder = new InMemoryOrderReadProjectionStore(),
    private readonly lineItemBuilder = new OrderReadLineItemProjectionBuilder(
      new OrderCategoryProjectionBuilder(drizzleCategoryResolutionPort)
    )
  ) {}

  async syncOrderProjections(orderId: number, eventId: string): Promise<void> {
    const source = await this.contextLoader.loadByOrderId(orderId);
    if (!source) return;

    const lineItems = await this.lineItemBuilder.buildLineItemsFromSource(source);
    const ownerRecord = this.recordBuilder.buildOwnerRecordFromSource(
      source,
      eventId,
      lineItems
    );
    await this.repos.ownerOrders.upsert(ownerRecord);
    const activeRecord: ActiveOrderProjectionRecord = {
      ...ownerRecord,
      projectionId: "P-02-active-orders",
    };
    const detailRecord: OrderDetailProjectionRecord = {
      ...ownerRecord,
      projectionId: "P-03-order-details",
    };
    await this.repos.activeOrders.upsert(activeRecord);
    await this.repos.orderDetails.upsert(detailRecord);

    if (!source.order.trackingToken) return;

    const itemCount = source.lineItems.reduce((sum, li) => sum + li.quantity, 0);
    await this.repos.publicOrderStatus.upsert({
      projectionId: "P-11-public-order-status",
      restaurantId: source.order.restaurantId,
      trackingToken: source.order.trackingToken,
      restaurantSlug: source.restaurantSlug,
      orderNumber: source.order.orderNumber,
      status: source.order.status,
      tableNumber: source.order.tableNumber,
      itemCount,
      totalAmount: String(source.order.totalAmount),
      createdAt: source.order.createdAt,
      readyAt: source.order.readyAt ?? null,
      schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
      lastEventId: eventId,
      updatedAt: new Date().toISOString(),
    });
  }

  async appendTimeline(envelope: EventEnvelope): Promise<void> {
    const payload = parsePayload(envelope);
    const restaurantId = envelope.restaurantId;
    const orderId = envelope.aggregateId;
    const occurredAt = envelope.occurredAt;

    if (payload.type === "OrderCreated") {
      await this.repos.orderTimeline.upsert({
        projectionId: "P-04-order-timeline",
        restaurantId,
        orderId,
        event: {
          eventId: envelope.eventId,
          fromStatus: null,
          toStatus: "pending",
          occurredAt,
        },
        schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
        lastEventId: envelope.eventId,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (payload.type === "OrderStatusChanged") {
      await this.repos.orderTimeline.upsert({
        projectionId: "P-04-order-timeline",
        restaurantId,
        orderId,
        event: {
          eventId: envelope.eventId,
          fromStatus: payload.fromStatus,
          toStatus: payload.toStatus,
          occurredAt: payload.changedAt,
        },
        schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
        lastEventId: envelope.eventId,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async adjustOperationalKpi(envelope: EventEnvelope): Promise<void> {
    const payload = parsePayload(envelope);
    const restaurantId = envelope.restaurantId;
    const dayKey = dayKeyFromTimestamp(envelope.occurredAt);
    const kpi = await this.getOrCreateKpi(restaurantId, dayKey);

    if (payload.type === "OrderCreated") {
      kpi.pendingOrders += 1;
      kpi.activeOrders = kpi.pendingOrders + kpi.preparingOrders + kpi.readyOrders;
    } else if (payload.type === "OrderStatusChanged") {
      const from = statusBucket(payload.fromStatus);
      const to = statusBucket(payload.toStatus);
      if (from) this.decrementKpiBucket(kpi, from);
      if (to) this.incrementKpiBucket(kpi, to);
      kpi.activeOrders = kpi.pendingOrders + kpi.preparingOrders + kpi.readyOrders;
    }

    kpi.lastEventId = envelope.eventId;
    kpi.updatedAt = new Date().toISOString();
    await this.repos.operationalKpi.upsert(kpi);
  }

  async adjustAnalytics(envelope: EventEnvelope): Promise<void> {
    const payload = parsePayload(envelope);
    const restaurantId = envelope.restaurantId;
    const dayKey = dayKeyFromTimestamp(envelope.occurredAt);
    const row = await this.getOrCreateAnalytics(restaurantId, dayKey);

    if (payload.type === "OrderCreated") {
      row.orderCount += 1;
    } else if (payload.type === "OrderCompleted") {
      row.completedOrderCount += 1;
      const source = await this.contextLoader.loadByOrderId(payload.orderId);
      if (source) {
        row.completedSales = addDecimal(row.completedSales, String(source.order.totalAmount));
      }
    }

    row.lastEventId = envelope.eventId;
    row.updatedAt = new Date().toISOString();
    await this.repos.orderAnalytics.upsert(row);
  }

  async handleOrderLifecycleEvent(envelope: EventEnvelope): Promise<void> {
    const payload = parsePayload(envelope);
    const orderId =
      payload.type === "OrderCreated"
        ? payload.orderId
        : payload.type === "OrderStatusChanged"
          ? payload.orderId
          : payload.orderId;

    await this.syncOrderProjections(orderId, envelope.eventId);
    await this.appendTimeline(envelope);
    await this.adjustOperationalKpi(envelope);
    if (payload.type === "OrderCreated" || payload.type === "OrderCompleted") {
      await this.adjustAnalytics(envelope);
    }
  }

  private async getOrCreateKpi(restaurantId: number, dayKey: string) {
    const existing = await this.repos.operationalKpi.getForDay(restaurantId, dayKey);
    if (existing) return { ...existing };
    return {
      projectionId: "P-06-operational-kpi" as const,
      restaurantId,
      dayKey,
      activeOrders: 0,
      pendingOrders: 0,
      preparingOrders: 0,
      readyOrders: 0,
      schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
      lastEventId: null,
      updatedAt: new Date().toISOString(),
    };
  }

  private async getOrCreateAnalytics(restaurantId: number, dayKey: string) {
    const existing = await this.repos.orderAnalytics.getDay(restaurantId, dayKey);
    if (existing) return { ...existing };
    return {
      projectionId: "P-10-analytics" as const,
      restaurantId,
      dayKey,
      orderCount: 0,
      completedOrderCount: 0,
      completedSales: "0.00",
      schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
      lastEventId: null,
      updatedAt: new Date().toISOString(),
    };
  }

  private incrementKpiBucket(
    kpi: {
      pendingOrders: number;
      preparingOrders: number;
      readyOrders: number;
    },
    bucket: "pending" | "preparing" | "ready"
  ): void {
    if (bucket === "pending") kpi.pendingOrders += 1;
    if (bucket === "preparing") kpi.preparingOrders += 1;
    if (bucket === "ready") kpi.readyOrders += 1;
  }

  private decrementKpiBucket(
    kpi: {
      pendingOrders: number;
      preparingOrders: number;
      readyOrders: number;
    },
    bucket: "pending" | "preparing" | "ready"
  ): void {
    if (bucket === "pending") kpi.pendingOrders = Math.max(0, kpi.pendingOrders - 1);
    if (bucket === "preparing") kpi.preparingOrders = Math.max(0, kpi.preparingOrders - 1);
    if (bucket === "ready") kpi.readyOrders = Math.max(0, kpi.readyOrders - 1);
  }

  /** Rebuild KPI/analytics counters from owner order rows (backfill). */
  async rebuildRollupsForRestaurant(restaurantId: number): Promise<void> {
    const kpiByDay = new Map<
      string,
      {
        projectionId: "P-06-operational-kpi";
        restaurantId: number;
        dayKey: string;
        activeOrders: number;
        pendingOrders: number;
        preparingOrders: number;
        readyOrders: number;
        schemaVersion: number;
        lastEventId: string | null;
        updatedAt: string;
      }
    >();
    const analyticsByDay = new Map<string, Awaited<ReturnType<OrderReadProjectionMaterializer["getOrCreateAnalytics"]>>>();

    const orders = await this.repos.ownerOrders.findPage({
      restaurantId,
      limit: 10_000,
    });

    for (const order of orders) {
      const dayKey = dayKeyFromTimestamp(order.createdAt);
      const kpi =
        kpiByDay.get(dayKey) ??
        {
          projectionId: "P-06-operational-kpi" as const,
          restaurantId,
          dayKey,
          activeOrders: 0,
          pendingOrders: 0,
          preparingOrders: 0,
          readyOrders: 0,
          schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
          lastEventId: null,
          updatedAt: new Date().toISOString(),
        };
      if (isActiveOrderStatus(order.status)) {
        const bucket = statusBucket(order.status);
        if (bucket) this.incrementKpiBucket(kpi, bucket);
      }
      kpiByDay.set(dayKey, kpi);

      const analytics =
        analyticsByDay.get(dayKey) ??
        {
          projectionId: "P-10-analytics" as const,
          restaurantId,
          dayKey,
          orderCount: 0,
          completedOrderCount: 0,
          completedSales: "0.00",
          schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
          lastEventId: null,
          updatedAt: new Date().toISOString(),
        };
      analytics.orderCount += 1;
      if (order.status === "served") {
        analytics.completedOrderCount += 1;
        analytics.completedSales = addDecimal(analytics.completedSales, order.totalAmount);
      }
      analyticsByDay.set(dayKey, analytics);
    }

    for (const kpi of Array.from(kpiByDay.values())) {
      kpi.activeOrders = kpi.pendingOrders + kpi.preparingOrders + kpi.readyOrders;
      await this.repos.operationalKpi.upsert(kpi);
    }
    for (const analytics of Array.from(analyticsByDay.values())) {
      await this.repos.orderAnalytics.upsert(analytics);
    }
  }
}
