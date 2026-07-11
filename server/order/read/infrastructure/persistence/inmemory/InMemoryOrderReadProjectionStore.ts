import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../../../domain/contracts/projectionIds";
import type {
  ActiveOrderLineItemDto,
  ActiveOrderListQuery,
  OrderDetailQuery,
} from "../../../domain/contracts/queryContracts";
import { clampActiveOrderLimit } from "../../../domain/contracts/queryContracts";
import { resolveOrderDisplayIdentity } from "../../../../business-identity/application/OrderDisplayIdentityResolver";
import { isActiveOrderStatus } from "../../../projections/materializers/projectionStatus";
import { isOrderInOperationalLifecycle } from "../../../projections/materializers/projectionLifecycle";
import {
  assertOrderLifecycleStage,
  DEFAULT_ORDER_LIFECYCLE_STAGE,
} from "../../../../domain/value-objects/OrderLifecycleStage";
import type {
  ActiveOrderProjectionKey,
  ActiveOrderProjectionRecord,
  OrderAnalyticsDayRecord,
  OrderReadProjectionRepositories,
  OrderDetailProjectionRecord,
  OrderTimelineProjectionKey,
  OrderTimelineProjectionRecord,
  OperationalKpiProjectionRecord,
  OwnerOrderProjectionRecord,
  PublicOrderStatusProjectionRecord,
} from "../contracts/ProjectionRepositoryContracts";
import type { OrderReadSourceContext } from "../OrderReadContextLoader";

function orderKey(restaurantId: number, orderId: number): string {
  return `${restaurantId}:${orderId}`;
}

export class InMemoryOrderReadProjectionStore {
  private readonly orders = new Map<string, OwnerOrderProjectionRecord>();
  private readonly timeline = new Map<string, OrderTimelineProjectionRecord>();
  private readonly kpiDaily = new Map<string, OperationalKpiProjectionRecord>();
  private readonly analyticsDaily = new Map<string, OrderAnalyticsDayRecord>();
  private readonly publicStatus = new Map<string, PublicOrderStatusProjectionRecord>();

  asRepositories(): OrderReadProjectionRepositories {
    const store = this;
    return {
      ownerOrders: {
        upsert: (r) => store.upsertOwnerOrder(r),
        deleteByKey: (k) => store.deleteByKey(k),
        findByKey: (k) => store.findByKey(k),
        findPage: (q) => store.findPage(q),
      },
      activeOrders: {
        upsert: (r) =>
          store.upsertOwnerOrder({
            ...r,
            projectionId: "P-01-owner-orders",
            servedAt: r.servedAt ?? null,
            cancelledAt: r.cancelledAt ?? null,
          }),
        deleteByKey: (k) => store.deleteByKey(k),
        findByKey: async (k) => {
          const row = await store.findByKey(k);
          return row ? store.toActiveRecord(row) : null;
        },
        findPage: (q) => store.findActivePage(q),
        countActive: (id) => store.countActive(id),
      },
      orderDetails: {
        upsert: (r) =>
          store.upsertOwnerOrder({
            ...r,
            projectionId: "P-01-owner-orders",
            servedAt: r.servedAt ?? null,
            cancelledAt: r.cancelledAt ?? null,
          }),
        deleteByKey: (k) => store.deleteByKey(k),
        findByKey: async (k) => {
          const row = await store.findByKey(k);
          return row ? store.toDetailRecord(row) : null;
        },
        getDetail: (q) => store.getDetail(q),
      },
      orderTimeline: {
        upsert: (r) => store.upsertTimeline(r),
        deleteByKey: (k) => store.deleteTimelineByKey(k),
        findByKey: (k) => store.findTimelineByKey(k),
        listByOrderId: (oid, rid, lim) => store.listByOrderId(oid, rid, lim),
      },
      operationalKpi: {
        upsert: (r) => store.upsertKpi(r),
        deleteByKey: async (k) => {
          store.kpiDaily.delete(`${k.restaurantId}:${k.dayKey}`);
        },
        findByKey: async (k) => store.getForDay(k.restaurantId, k.dayKey),
        getForDay: (rid, dk) => store.getForDay(rid, dk),
      },
      publicOrderStatus: {
        upsert: (r) => store.upsertPublicStatus(r),
        deleteByKey: async (k) => {
          store.publicStatus.delete(`${k.trackingToken}:${k.restaurantSlug}`);
        },
        findByKey: (k) => store.findByTrackingToken(k.trackingToken, k.restaurantSlug),
        findByTrackingToken: (t, s) => store.findByTrackingToken(t, s),
      },
      orderAnalytics: {
        upsert: (r) => store.upsertAnalytics(r),
        deleteByKey: async (k) => {
          store.analyticsDaily.delete(`${k.restaurantId}:${k.dayKey}`);
        },
        findByKey: async (k) => store.getDay(k.restaurantId, k.dayKey),
        getDay: (rid, dk) => store.getDay(rid, dk),
        listDaysInMonth: (rid, y, m) => store.listDaysInMonth(rid, y, m),
      },
    };
  }

  clear(): void {
    this.orders.clear();
    this.timeline.clear();
    this.kpiDaily.clear();
    this.analyticsDaily.clear();
    this.publicStatus.clear();
  }

  async upsertOwnerOrder(record: OwnerOrderProjectionRecord): Promise<void> {
    this.orders.set(orderKey(record.restaurantId, record.orderId), { ...record });
  }

  async upsert(record: OwnerOrderProjectionRecord): Promise<void> {
    await this.upsertOwnerOrder(record);
  }

  async deleteByKey(key: ActiveOrderProjectionKey): Promise<void> {
    this.orders.delete(orderKey(key.restaurantId, key.orderId));
  }

  async findByKey(key: ActiveOrderProjectionKey): Promise<OwnerOrderProjectionRecord | null> {
    return this.orders.get(orderKey(key.restaurantId, key.orderId)) ?? null;
  }

  async findPage(query: ActiveOrderListQuery): Promise<OwnerOrderProjectionRecord[]> {
    const limit = clampActiveOrderLimit(query.limit);
    let rows = Array.from(this.orders.values()).filter((r) => r.restaurantId === query.restaurantId);
    if (query.status && query.status !== "all-active") {
      rows = rows.filter((r) => r.status === query.status);
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return rows.slice(0, limit);
  }

  async findActivePage(query: ActiveOrderListQuery): Promise<ActiveOrderProjectionRecord[]> {
    const limit = clampActiveOrderLimit(query.limit);
    const rows = Array.from(this.orders.values())
      .filter(
        (r) =>
          r.restaurantId === query.restaurantId &&
          isOrderInOperationalLifecycle(assertOrderLifecycleStage(r.lifecycle))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    return rows.map((r) => this.toActiveRecord(r));
  }

  toActiveRecord(row: OwnerOrderProjectionRecord): ActiveOrderProjectionRecord {
    return { ...row, projectionId: "P-02-active-orders" };
  }

  toDetailRecord(row: OwnerOrderProjectionRecord): OrderDetailProjectionRecord {
    return { ...row, projectionId: "P-03-order-details" };
  }

  async countActive(restaurantId: number): Promise<number> {
    return Array.from(this.orders.values()).filter(
      (r) =>
        r.restaurantId === restaurantId &&
        isOrderInOperationalLifecycle(assertOrderLifecycleStage(r.lifecycle))
    ).length;
  }

  async getDetail(query: OrderDetailQuery): Promise<OrderDetailProjectionRecord | null> {
    const row = await this.findByKey({
      restaurantId: query.restaurantId,
      orderId: query.orderId,
    });
    if (!row) return null;
    return this.toDetailRecord(row);
  }

  async upsertTimeline(record: OrderTimelineProjectionRecord): Promise<void> {
    const key = `${record.restaurantId}:${record.orderId}:${record.event.eventId}`;
    this.timeline.set(key, { ...record });
  }

  async deleteTimelineByKey(key: OrderTimelineProjectionKey): Promise<void> {
    this.timeline.delete(`${key.restaurantId}:${key.orderId}:${key.eventId}`);
  }

  async findTimelineByKey(
    key: OrderTimelineProjectionKey
  ): Promise<OrderTimelineProjectionRecord | null> {
    return this.timeline.get(`${key.restaurantId}:${key.orderId}:${key.eventId}`) ?? null;
  }

  async listByOrderId(
    orderId: number,
    restaurantId: number,
    limit = 50
  ): Promise<OrderTimelineProjectionRecord[]> {
    return Array.from(this.timeline.values())
      .filter((r) => r.restaurantId === restaurantId && r.orderId === orderId)
      .sort((a, b) => a.event.occurredAt.localeCompare(b.event.occurredAt))
      .slice(0, limit);
  }

  async upsertKpi(record: OperationalKpiProjectionRecord): Promise<void> {
    this.kpiDaily.set(`${record.restaurantId}:${record.dayKey}`, { ...record });
  }

  async getForDay(
    restaurantId: number,
    dayKey: string
  ): Promise<OperationalKpiProjectionRecord | null> {
    return this.kpiDaily.get(`${restaurantId}:${dayKey}`) ?? null;
  }

  async getOrCreateKpi(
    restaurantId: number,
    dayKey: string
  ): Promise<OperationalKpiProjectionRecord> {
    const existing = await this.getForDay(restaurantId, dayKey);
    if (existing) return existing;
    const created: OperationalKpiProjectionRecord = {
      projectionId: "P-06-operational-kpi",
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
    await this.upsertKpi(created);
    return created;
  }

  async upsertAnalytics(record: OrderAnalyticsDayRecord): Promise<void> {
    this.analyticsDaily.set(`${record.restaurantId}:${record.dayKey}`, { ...record });
  }

  async getDay(restaurantId: number, dayKey: string): Promise<OrderAnalyticsDayRecord | null> {
    return this.analyticsDaily.get(`${restaurantId}:${dayKey}`) ?? null;
  }

  async getOrCreateAnalytics(
    restaurantId: number,
    dayKey: string
  ): Promise<OrderAnalyticsDayRecord> {
    const existing = await this.getDay(restaurantId, dayKey);
    if (existing) return existing;
    const created: OrderAnalyticsDayRecord = {
      projectionId: "P-10-analytics",
      restaurantId,
      dayKey,
      orderCount: 0,
      completedOrderCount: 0,
      completedSales: "0.00",
      schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
      lastEventId: null,
      updatedAt: new Date().toISOString(),
    };
    await this.upsertAnalytics(created);
    return created;
  }

  async listDaysInMonth(
    restaurantId: number,
    year: number,
    month: number
  ): Promise<OrderAnalyticsDayRecord[]> {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return Array.from(this.analyticsDaily.values()).filter(
      (r) => r.restaurantId === restaurantId && r.dayKey.startsWith(prefix)
    );
  }

  async upsertPublicStatus(record: PublicOrderStatusProjectionRecord): Promise<void> {
    this.publicStatus.set(`${record.trackingToken}:${record.restaurantSlug}`, { ...record });
  }

  async findByTrackingToken(
    trackingToken: string,
    restaurantSlug: string
  ): Promise<PublicOrderStatusProjectionRecord | null> {
    return this.publicStatus.get(`${trackingToken}:${restaurantSlug}`) ?? null;
  }

  buildOwnerRecordFromSource(
    source: OrderReadSourceContext,
    eventId: string | null,
    lineItems: ActiveOrderLineItemDto[],
    servedAt: string | null = null,
    cancelledAt: string | null = null
  ): OwnerOrderProjectionRecord {
    const { order } = source;
    const now = new Date().toISOString();
    const identity = resolveOrderDisplayIdentity({
      orderNumber: order.orderNumber,
      businessDay: order.businessDay ?? null,
      dailyDisplayNumber: order.dailyDisplayNumber ?? null,
    });
    return {
      projectionId: "P-01-owner-orders",
      restaurantId: order.restaurantId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      businessDay: order.businessDay ?? null,
      dailyDisplayNumber: order.dailyDisplayNumber ?? null,
      displayOrderNumber: identity.displayOrderNumber,
      displayReference: identity.displayReference,
      status: order.status,
      lifecycle: assertOrderLifecycleStage(
        order.lifecycleStage ?? DEFAULT_ORDER_LIFECYCLE_STAGE
      ),
      tableNumber: order.tableNumber,
      sessionId: order.sessionId ?? null,
      customerName: order.customerName ?? null,
      customerPhone: order.customerPhone ?? null,
      notes: order.notes ?? null,
      totalAmount: String(order.totalAmount),
      createdAt: order.createdAt,
      readyAt: order.readyAt ?? null,
      servedAt: servedAt ?? (order.status === "served" ? order.updatedAt : null),
      cancelledAt:
        cancelledAt ?? (order.status === "cancelled" ? order.updatedAt : null),
      lineItems,
      schemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
      lastEventId: eventId,
      updatedAt: now,
    };
  }
}
