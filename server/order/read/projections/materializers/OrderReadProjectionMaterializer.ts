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
import { orderAnalyticsBusinessDayKey } from "./orderAnalyticsDayKey";
import {
  InMemoryP10AnalyticsCompletionIdempotencyStore,
  type P10AnalyticsCompletionIdempotencyStore,
} from "./p10AnalyticsCompletionIdempotency";
import type { DurableBusinessClaimStore } from "../../../infrastructure/events/consumers/idempotency/DurableBusinessClaimStore";
import {
  BUSINESS_CLAIM_NS,
  InMemoryDurableBusinessClaimStore,
  p06CanonicalTransitionsForStatus,
  p06OrderCreatedKey,
  p06StatusTransitionKey,
} from "../../../infrastructure/events/consumers/idempotency/DurableBusinessClaimStore";
import { isOrderInOperationalLifecycle } from "./projectionLifecycle";
import {
  assertOrderLifecycleStage,
  DEFAULT_ORDER_LIFECYCLE_STAGE,
} from "../../../domain/value-objects/OrderLifecycleStage";
import type { DrizzleBusinessIdentityAllocator } from "../../../business-identity/infrastructure/DrizzleBusinessIdentityAllocator";
import { restaurantOpeningTimeResolver } from "../../../business-identity/infrastructure/RestaurantOpeningTimeResolver";
import type { NormalizedWorkingHours } from "@shared/utils/businessDay";

function parsePayload(envelope: EventEnvelope): OrderDomainEvent {
  return envelope.payload as OrderDomainEvent;
}

function addDecimal(a: string, b: string): string {
  return (Number(a) + Number(b)).toFixed(2);
}

export class OrderReadProjectionMaterializer {
  private readonly businessIdentityAllocator?: DrizzleBusinessIdentityAllocator;
  private readonly completionIdempotency: P10AnalyticsCompletionIdempotencyStore;
  private readonly kpiClaims: DurableBusinessClaimStore;

  constructor(
    private readonly repos: OrderReadProjectionRepositories,
    private readonly contextLoader: OrderReadContextLoader,
    private readonly recordBuilder: InMemoryOrderReadProjectionStore = new InMemoryOrderReadProjectionStore(),
    private readonly lineItemBuilder: OrderReadLineItemProjectionBuilder = new OrderReadLineItemProjectionBuilder(
      new OrderCategoryProjectionBuilder(drizzleCategoryResolutionPort)
    ),
    options?: {
      businessIdentityAllocator?: DrizzleBusinessIdentityAllocator;
      completionIdempotency?: P10AnalyticsCompletionIdempotencyStore;
      kpiClaims?: DurableBusinessClaimStore;
    }
  ) {
    this.businessIdentityAllocator = options?.businessIdentityAllocator;
    this.completionIdempotency =
      options?.completionIdempotency ??
      new InMemoryP10AnalyticsCompletionIdempotencyStore();
    this.kpiClaims =
      options?.kpiClaims ?? new InMemoryDurableBusinessClaimStore();
  }

  async syncOrderProjections(orderId: number, eventId: string): Promise<void> {
    if (this.businessIdentityAllocator) {
      const preview = await this.contextLoader.loadByOrderId(orderId);
      if (preview) {
        await this.businessIdentityAllocator.ensureAssigned(
          orderId,
          preview.order.restaurantId,
          preview.order.createdAt,
          {
            correlationId: eventId,
            workerId: process.env.BUSINESS_IDENTITY_WORKER_ID ?? "projection",
            fulfilmentAnchorType: preview.order.fulfilmentAnchorType,
            serviceMode: preview.order.serviceMode,
            identityScope: preview.order.identityScope,
          }
        );
      }
    }

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
      businessDay: source.order.businessDay ?? null,
      dailyDisplayNumber: source.order.dailyDisplayNumber ?? null,
      identityScope: source.order.identityScope ?? null,
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
    const hours = await this.hoursFor(restaurantId);
    const dayKey = dayKeyFromTimestamp(envelope.occurredAt, hours);
    const kpi = await this.getOrCreateKpi(restaurantId, dayKey);

    if (payload.type === "OrderCreated") {
      // ADR-ARCH-021 Pattern B — once-per-order Created increment.
      const claimed = await this.kpiClaims.tryClaim(
        BUSINESS_CLAIM_NS.p06Kpi,
        p06OrderCreatedKey(restaurantId, payload.orderId)
      );
      if (!claimed) {
        kpi.lastEventId = envelope.eventId;
        kpi.updatedAt = new Date().toISOString();
        await this.repos.operationalKpi.upsert(kpi);
        return;
      }
      kpi.pendingOrders += 1;
      kpi.activeOrders = kpi.pendingOrders + kpi.preparingOrders + kpi.readyOrders;
    } else if (payload.type === "OrderStatusChanged") {
      const claimed = await this.kpiClaims.tryClaim(
        BUSINESS_CLAIM_NS.p06Kpi,
        p06StatusTransitionKey(
          restaurantId,
          payload.orderId,
          payload.fromStatus,
          payload.toStatus
        )
      );
      if (!claimed) {
        kpi.lastEventId = envelope.eventId;
        kpi.updatedAt = new Date().toISOString();
        await this.repos.operationalKpi.upsert(kpi);
        return;
      }
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

  /**
   * P-10 Order Analytics — REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1.
   * dayKey always from order.createdAt via orderAnalyticsBusinessDayKey.
   * Never envelope.occurredAt / servedAt (those diverge from rebuild).
   */
  async adjustAnalytics(envelope: EventEnvelope): Promise<void> {
    const payload = parsePayload(envelope);
    if (payload.type !== "OrderCreated" && payload.type !== "OrderCompleted") {
      return;
    }

    const restaurantId = envelope.restaurantId;
    const hours = await this.hoursFor(restaurantId);
    const source = await this.contextLoader.loadByOrderId(payload.orderId);
    const createdAt =
      source?.order.createdAt ??
      (payload.type === "OrderCreated" ? payload.createdAt : null);
    if (!createdAt) {
      return;
    }

    const dayKey = orderAnalyticsBusinessDayKey(createdAt, hours);
    const row = await this.getOrCreateAnalytics(restaurantId, dayKey);

    if (payload.type === "OrderCreated") {
      row.orderCount += 1;
    } else {
      // P10-ORDER-COMPLETION-IDEMPOTENCY-1 — claim once per business order.
      const claimed = await this.completionIdempotency.tryClaimCompletion(
        restaurantId,
        payload.orderId
      );
      if (!claimed) {
        row.lastEventId = envelope.eventId;
        row.updatedAt = new Date().toISOString();
        await this.repos.orderAnalytics.upsert(row);
        return;
      }

      row.completedOrderCount += 1;
      if (source) {
        row.completedSales = addDecimal(
          row.completedSales,
          String(source.order.totalAmount)
        );
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

  private async hoursFor(restaurantId: number): Promise<NormalizedWorkingHours> {
    return restaurantOpeningTimeResolver.getWorkingHours(restaurantId);
  }

  /**
   * REPORTING-BUSINESS-DAY-BACKFILL-1 / ORDER-ANALYTICS-DAYKEY-UNIFICATION-1 —
   * replace daily rollups for a restaurant.
   *
   * Scans every write-model order (not findPage/100 clamp).
   * P-10 dayKey via orderAnalyticsBusinessDayKey(createdAt) — same helper as
   * incremental adjustAnalytics. P-06 operational deltas remain event-time
   * (snapshot rebuild keys active orders by createdAt for kitchen day placement).
   * Deletes prior P-06/P-10 rows so stale keys cannot remain. Idempotent.
   */
  async rebuildRollupsForRestaurant(restaurantId: number): Promise<{
    ordersScanned: number;
    dayKeysWritten: number;
  }> {
    const hours = await this.hoursFor(restaurantId);
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
    const analyticsByDay = new Map<
      string,
      Awaited<ReturnType<OrderReadProjectionMaterializer["getOrCreateAnalytics"]>>
    >();

    const orderIds =
      await this.contextLoader.listOrderIdsForRestaurant(restaurantId);
    let ordersScanned = 0;

    for (const orderId of orderIds) {
      const source = await this.contextLoader.loadByOrderId(orderId);
      if (!source || source.order.restaurantId !== restaurantId) continue;
      ordersScanned += 1;
      const order = source.order;
      // P-06 snapshot placement (operational) — createdAt BD
      const dayKey = dayKeyFromTimestamp(order.createdAt, hours);
      // P-10 analytics — identical canonical helper as incremental path
      const analyticsDayKey = orderAnalyticsBusinessDayKey(order.createdAt, hours);
      const lifecycle = assertOrderLifecycleStage(
        order.lifecycleStage ?? DEFAULT_ORDER_LIFECYCLE_STAGE
      );
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
      if (
        isOrderInOperationalLifecycle(lifecycle) &&
        isActiveOrderStatus(order.status)
      ) {
        const bucket = statusBucket(order.status);
        if (bucket) this.incrementKpiBucket(kpi, bucket);
      }
      kpiByDay.set(dayKey, kpi);

      // Seed P-06 claims so post-rebuild duplicate events cannot re-skew counters.
      await this.kpiClaims.markClaimed(
        BUSINESS_CLAIM_NS.p06Kpi,
        p06OrderCreatedKey(restaurantId, orderId)
      );
      for (const [from, to] of p06CanonicalTransitionsForStatus(order.status)) {
        await this.kpiClaims.markClaimed(
          BUSINESS_CLAIM_NS.p06Kpi,
          p06StatusTransitionKey(restaurantId, orderId, from, to)
        );
      }

      const analytics =
        analyticsByDay.get(analyticsDayKey) ??
        {
          projectionId: "P-10-analytics" as const,
          restaurantId,
          dayKey: analyticsDayKey,
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
        analytics.completedSales = addDecimal(
          analytics.completedSales,
          String(order.totalAmount)
        );
        // Seed completion markers so post-rebuild duplicate OrderCompleted is harmless.
        await this.completionIdempotency.markCompletionApplied(
          restaurantId,
          orderId
        );
      }
      analyticsByDay.set(analyticsDayKey, analytics);
    }

    // Delete-then-upsert: remove orphan UTC/wall dayKeys from prior materialization.
    await this.repos.operationalKpi.deleteAllForRestaurant(restaurantId);
    await this.repos.orderAnalytics.deleteAllForRestaurant(restaurantId);

    for (const kpi of Array.from(kpiByDay.values())) {
      kpi.activeOrders =
        kpi.pendingOrders + kpi.preparingOrders + kpi.readyOrders;
      await this.repos.operationalKpi.upsert(kpi);
    }
    for (const analytics of Array.from(analyticsByDay.values())) {
      await this.repos.orderAnalytics.upsert(analytics);
    }

    return {
      ordersScanned,
      dayKeysWritten: Math.max(kpiByDay.size, analyticsByDay.size),
    };
  }
}
