import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveNormalizedOpeningHours } from "@shared/utils/businessDay";
import type { EventEnvelope } from "../../../../infrastructure/events/EventEnvelope";
import { InMemoryOrderReadProjectionStore } from "../../../infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import type {
  OrderReadContextLoader,
  OrderReadSourceContext,
} from "../../../infrastructure/persistence/OrderReadContextLoader";
import { OrderCategoryProjectionBuilder } from "../../builders/OrderCategoryProjectionBuilder";
import { OrderReadLineItemProjectionBuilder } from "../../builders/OrderReadLineItemProjectionBuilder";
import { OrderReadProjectionMaterializer } from "../OrderReadProjectionMaterializer";
import { InMemoryDurableBusinessClaimStore } from "../../../../infrastructure/events/consumers/idempotency/DurableBusinessClaimStore";

vi.mock("../../../../business-identity/infrastructure/RestaurantOpeningTimeResolver", () => ({
  restaurantOpeningTimeResolver: {
    getWorkingHours: vi.fn(async () => resolveNormalizedOpeningHours(null)),
  },
}));

function source(
  orderId: number,
  status: string,
  createdAt = "2026-07-19 12:00:00"
): OrderReadSourceContext {
  return {
    order: {
      id: orderId,
      restaurantId: 1,
      tableId: 2,
      tableNumber: 4,
      sessionId: null,
      serviceMode: "table_service",
      fulfilmentAnchorType: "table",
      fulfilmentLabel: "4",
      customerName: null,
      businessDay: "2026-07-19",
      dailyDisplayNumber: orderId,
      identityScope: null,
      customerPhone: null,
      status,
      lifecycleStage: status === "served" || status === "cancelled" ? "completed" : "active",
      notes: null,
      totalAmount: "10.00",
      orderNumber: `ORD-${orderId}`,
      trackingToken: `tok-${orderId}`,
      readyPushSentAt: null,
      readyAt: null,
      whatsappSent: false,
      createdAt,
      updatedAt: createdAt,
    },
    lineItems: [],
    restaurantSlug: "demo",
  };
}

function createdEnv(orderId: number, eventId: string): EventEnvelope {
  return {
    id: `o-${eventId}`,
    eventId,
    eventType: "OrderCreated",
    aggregateType: "Order",
    aggregateId: orderId,
    aggregateVersion: null,
    restaurantId: 1,
    sequenceNumber: 1,
    occurredAt: "2026-07-19 12:00:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: {
      type: "OrderCreated",
      schemaVersion: 1,
      orderId,
      restaurantId: 1,
      tableId: 2,
      tableNumber: 4,
      orderNumber: `ORD-${orderId}`,
      trackingToken: `tok-${orderId}`,
      totalAmount: "10.00",
      lineCount: 0,
      sessionId: null,
      createdAt: "2026-07-19 12:00:00",
    },
  };
}

function statusEnv(
  orderId: number,
  eventId: string,
  fromStatus: string,
  toStatus: string
): EventEnvelope {
  return {
    id: `o-${eventId}`,
    eventId,
    eventType: "OrderStatusChanged",
    aggregateType: "Order",
    aggregateId: orderId,
    aggregateVersion: null,
    restaurantId: 1,
    sequenceNumber: 2,
    occurredAt: "2026-07-19 12:05:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: {
      type: "OrderStatusChanged",
      schemaVersion: 1,
      orderId,
      restaurantId: 1,
      fromStatus,
      toStatus,
      changedAt: "2026-07-19 12:05:00",
    },
  };
}

describe("P-06 operational KPI business idempotency", () => {
  const store = new InMemoryOrderReadProjectionStore();
  const kpiClaims = new InMemoryDurableBusinessClaimStore();
  const sources = new Map<number, OrderReadSourceContext>();
  const loader: OrderReadContextLoader = {
    loadByOrderId: vi.fn(async (id: number) => sources.get(id) ?? null),
    listOrderIdsForRestaurant: vi.fn(async () => Array.from(sources.keys())),
    listRestaurantIds: vi.fn(async () => [1]),
  };
  let materializer: OrderReadProjectionMaterializer;

  beforeEach(() => {
    store.clear();
    kpiClaims.clear();
    sources.clear();
    sources.set(10, source(10, "pending"));
    materializer = new OrderReadProjectionMaterializer(
      store.asRepositories(),
      loader,
      store,
      new OrderReadLineItemProjectionBuilder(
        new OrderCategoryProjectionBuilder({
          batchResolveMenuItemCategories: async () => new Map(),
        })
      ),
      { kpiClaims }
    );
  });

  it("increments pending once for a single OrderCreated", async () => {
    await materializer.adjustOperationalKpi(createdEnv(10, "e1"));
    const kpi = await store.asRepositories().operationalKpi.getForDay(1, "2026-07-19");
    expect(kpi?.pendingOrders).toBe(1);
    expect(kpi?.activeOrders).toBe(1);
  });

  it("ignores duplicate OrderCreated with distinct eventIds", async () => {
    await materializer.adjustOperationalKpi(createdEnv(10, "e1"));
    await materializer.adjustOperationalKpi(createdEnv(10, "e2"));
    const kpi = await store.asRepositories().operationalKpi.getForDay(1, "2026-07-19");
    expect(kpi?.pendingOrders).toBe(1);
  });

  it("applies a status transition once under distinct eventIds", async () => {
    await materializer.adjustOperationalKpi(createdEnv(10, "c1"));
    await materializer.adjustOperationalKpi(
      statusEnv(10, "s1", "pending", "preparing")
    );
    await materializer.adjustOperationalKpi(
      statusEnv(10, "s2", "pending", "preparing")
    );
    const kpi = await store.asRepositories().operationalKpi.getForDay(1, "2026-07-19");
    expect(kpi?.pendingOrders).toBe(0);
    expect(kpi?.preparingOrders).toBe(1);
  });

  it("replay after rebuild does not re-skew counters", async () => {
    sources.set(10, source(10, "preparing"));
    await materializer.rebuildRollupsForRestaurant(1);

    let kpi = await store.asRepositories().operationalKpi.getForDay(1, "2026-07-19");
    expect(kpi?.preparingOrders).toBe(1);
    expect(kpi?.pendingOrders).toBe(0);

    await materializer.adjustOperationalKpi(createdEnv(10, "replay-c"));
    await materializer.adjustOperationalKpi(
      statusEnv(10, "replay-s", "pending", "preparing")
    );

    kpi = await store.asRepositories().operationalKpi.getForDay(1, "2026-07-19");
    expect(kpi?.preparingOrders).toBe(1);
    expect(kpi?.pendingOrders).toBe(0);
  });

  it("repeated rebuild remains stable", async () => {
    sources.set(10, source(10, "ready"));
    await materializer.rebuildRollupsForRestaurant(1);
    await materializer.rebuildRollupsForRestaurant(1);
    const kpi = await store.asRepositories().operationalKpi.getForDay(1, "2026-07-19");
    expect(kpi?.readyOrders).toBe(1);
    expect(kpi?.activeOrders).toBe(1);
  });
});
