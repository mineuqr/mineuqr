import { describe, expect, it, vi, beforeEach } from "vitest";
import type { EventEnvelope } from "../../../../infrastructure/events/EventEnvelope";
import { InMemoryOrderReadProjectionStore } from "../../../infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import { OrderReadProjectionMaterializer } from "../OrderReadProjectionMaterializer";
import type { OrderReadContextLoader, OrderReadSourceContext } from "../../../infrastructure/persistence/OrderReadContextLoader";

function source(): OrderReadSourceContext {
  return {
    order: {
      id: 10,
      restaurantId: 1,
      tableId: 2,
      tableNumber: 4,
      sessionId: null,
      serviceMode: "table_service",
      fulfilmentAnchorType: "table",
      fulfilmentLabel: "4",
      customerName: null,
      businessDay: null,
      dailyDisplayNumber: null,
      customerPhone: null,
      status: "pending",
      lifecycleStage: "active",
      notes: null,
      totalAmount: "30.00",
      orderNumber: "ORD-0010",
      trackingToken: "tok-10",
      readyPushSentAt: null,
      readyAt: null,
      whatsappSent: false,
      createdAt: "2026-06-27 12:00:00",
      updatedAt: "2026-06-27 12:00:00",
    },
    lineItems: [],
    restaurantSlug: "slug-1",
  };
}

function envelope(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    id: "outbox-1",
    eventId: "evt-m-1",
    eventType: "OrderCreated",
    aggregateType: "Order",
    aggregateId: 10,
    aggregateVersion: null,
    restaurantId: 1,
    sequenceNumber: 1,
    occurredAt: "2026-06-27 12:00:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: {
      type: "OrderCreated",
      schemaVersion: 1,
      orderId: 10,
      restaurantId: 1,
      tableId: 2,
      tableNumber: 4,
      orderNumber: "ORD-0010",
      trackingToken: "tok-10",
      totalAmount: "30.00",
      lineCount: 0,
      sessionId: null,
      createdAt: "2026-06-27 12:00:00",
    },
    ...overrides,
  };
}

describe("OrderReadProjectionMaterializer", () => {
  const store = new InMemoryOrderReadProjectionStore();
  const loader: OrderReadContextLoader = {
    loadByOrderId: vi.fn(async () => source()),
    listOrderIdsForRestaurant: vi.fn(async () => [10]),
    listRestaurantIds: vi.fn(async () => [1]),
  };
  const materializer = new OrderReadProjectionMaterializer(
    store.asRepositories(),
    loader,
    store
  );

  beforeEach(() => {
    store.clear();
  });

  it("syncs order projections on OrderCreated", async () => {
    await materializer.handleOrderLifecycleEvent(envelope());

    const owner = await store.asRepositories().ownerOrders.findByKey({
      restaurantId: 1,
      orderId: 10,
    });
    expect(owner?.orderNumber).toBe("ORD-0010");

    const publicStatus = await store
      .asRepositories()
      .publicOrderStatus.findByTrackingToken("tok-10", "slug-1");
    expect(publicStatus?.status).toBe("pending");
  });

  it("appends timeline on status change", async () => {
    await materializer.handleOrderLifecycleEvent(
      envelope({
        eventId: "evt-m-2",
        eventType: "OrderStatusChanged",
        payload: {
          type: "OrderStatusChanged",
          schemaVersion: 1,
          orderId: 10,
          restaurantId: 1,
          fromStatus: "pending",
          toStatus: "preparing",
          changedAt: "2026-06-27 12:05:00",
        },
      })
    );

    const timeline = await store.asRepositories().orderTimeline.listByOrderId(10, 1);
    expect(timeline.some((e) => e.event.toStatus === "preparing")).toBe(true);
  });

  it("increments operational KPI on create", async () => {
    await materializer.handleOrderLifecycleEvent(envelope());
    const kpi = await store.asRepositories().operationalKpi.getForDay(1, "2026-06-27");
    expect(kpi?.pendingOrders).toBe(1);
    expect(kpi?.activeOrders).toBe(1);
  });
});
