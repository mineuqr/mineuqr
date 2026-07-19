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
import { InMemoryP10AnalyticsCompletionIdempotencyStore } from "../p10AnalyticsCompletionIdempotency";

const noopCategoryPort = {
  batchResolveMenuItemCategories: async () => new Map(),
};

vi.mock("../../../../business-identity/infrastructure/RestaurantOpeningTimeResolver", () => ({
  restaurantOpeningTimeResolver: {
    getWorkingHours: vi.fn(async () => resolveNormalizedOpeningHours(null)),
  },
}));

function servedSource(orderId: number, total = "10.00"): OrderReadSourceContext {
  return {
    order: {
      id: orderId,
      restaurantId: 720007,
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
      status: "served",
      lifecycleStage: "completed",
      notes: null,
      totalAmount: total,
      orderNumber: `ORD-${orderId}`,
      trackingToken: `tok-${orderId}`,
      readyPushSentAt: null,
      readyAt: null,
      whatsappSent: false,
      createdAt: "2026-07-19 12:00:00",
      updatedAt: "2026-07-19 12:30:00",
    },
    lineItems: [],
    restaurantSlug: "demo",
  };
}

function completedEnvelope(orderId: number, eventId: string): EventEnvelope {
  return {
    id: `outbox-${eventId}`,
    eventId,
    eventType: "OrderCompleted",
    aggregateType: "Order",
    aggregateId: orderId,
    aggregateVersion: null,
    restaurantId: 720007,
    sequenceNumber: 1,
    occurredAt: "2026-07-19 12:30:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: {
      type: "OrderCompleted",
      schemaVersion: 1,
      orderId,
      servedAt: "2026-07-19 12:30:00",
    },
  };
}

describe("P10 analytics completion idempotency", () => {
  const store = new InMemoryOrderReadProjectionStore();
  const completionStore = new InMemoryP10AnalyticsCompletionIdempotencyStore();
  const sources = new Map<number, OrderReadSourceContext>();
  const loader: OrderReadContextLoader = {
    loadByOrderId: vi.fn(async (id: number) => sources.get(id) ?? null),
    listOrderIdsForRestaurant: vi.fn(async () => Array.from(sources.keys())),
    listRestaurantIds: vi.fn(async () => [720007]),
  };
  let materializer: OrderReadProjectionMaterializer;

  beforeEach(() => {
    store.clear();
    completionStore.clear();
    sources.clear();
    sources.set(5580001, servedSource(5580001, "10.00"));
    sources.set(5580002, servedSource(5580002, "10.00"));
    sources.set(5580003, servedSource(5580003, "10.00"));
    materializer = new OrderReadProjectionMaterializer(
      store.asRepositories(),
      loader,
      store,
      new OrderReadLineItemProjectionBuilder(
        new OrderCategoryProjectionBuilder(noopCategoryPort)
      ),
      { completionIdempotency: completionStore }
    );
  });

  it("increments completed sales exactly once for a single completion", async () => {
    await materializer.adjustAnalytics(completedEnvelope(5580001, "evt-a"));

    const day = await store
      .asRepositories()
      .orderAnalytics.getDay(720007, "2026-07-19");
    expect(day?.completedOrderCount).toBe(1);
    expect(day?.completedSales).toBe("10.00");
  });

  it("ignores duplicate OrderCompleted with distinct eventIds (outbox redelivery)", async () => {
    await materializer.adjustAnalytics(completedEnvelope(5580001, "evt-a"));
    await materializer.adjustAnalytics(completedEnvelope(5580001, "evt-b"));
    await materializer.adjustAnalytics(completedEnvelope(5580001, "evt-a"));

    const day = await store
      .asRepositories()
      .orderAnalytics.getDay(720007, "2026-07-19");
    expect(day?.completedOrderCount).toBe(1);
    expect(day?.completedSales).toBe("10.00");
  });

  it("counts three distinct order completions once each", async () => {
    for (const orderId of [5580001, 5580002, 5580003]) {
      await materializer.adjustAnalytics(
        completedEnvelope(orderId, `evt-${orderId}-1`)
      );
      await materializer.adjustAnalytics(
        completedEnvelope(orderId, `evt-${orderId}-2`)
      );
    }

    const day = await store
      .asRepositories()
      .orderAnalytics.getDay(720007, "2026-07-19");
    expect(day?.completedOrderCount).toBe(3);
    expect(day?.completedSales).toBe("30.00");
  });

  it("replay after rebuild remains identical (seeded markers)", async () => {
    await materializer.rebuildRollupsForRestaurant(720007);

    let day = await store
      .asRepositories()
      .orderAnalytics.getDay(720007, "2026-07-19");
    expect(day?.completedOrderCount).toBe(3);
    expect(day?.completedSales).toBe("30.00");

    for (const orderId of [5580001, 5580002, 5580003]) {
      await materializer.adjustAnalytics(
        completedEnvelope(orderId, `replay-${orderId}`)
      );
    }

    day = await store
      .asRepositories()
      .orderAnalytics.getDay(720007, "2026-07-19");
    expect(day?.completedOrderCount).toBe(3);
    expect(day?.completedSales).toBe("30.00");
  });

  it("repeated projection execution is stable", async () => {
    await materializer.rebuildRollupsForRestaurant(720007);
    await materializer.rebuildRollupsForRestaurant(720007);

    const day = await store
      .asRepositories()
      .orderAnalytics.getDay(720007, "2026-07-19");
    expect(day?.completedOrderCount).toBe(3);
    expect(day?.completedSales).toBe("30.00");
  });
});
