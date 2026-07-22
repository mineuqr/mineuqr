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
import {
  InMemoryDurableBusinessClaimStore,
  timelineCreatedEventId,
  timelineTransitionEventId,
} from "../../../../infrastructure/events/consumers/idempotency/DurableBusinessClaimStore";
import { InMemoryP10AnalyticsCompletionIdempotencyStore } from "../p10AnalyticsCompletionIdempotency";

vi.mock("../../../../business-identity/infrastructure/RestaurantOpeningTimeResolver", () => ({
  restaurantOpeningTimeResolver: {
    getWorkingHours: vi.fn(async () => resolveNormalizedOpeningHours(null)),
  },
}));

function source(
  orderId: number,
  status = "pending",
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
      lifecycleStage:
        status === "served" || status === "cancelled" ? "completed" : "active",
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

describe("EVENT-PROJECTION-IDEMPOTENCY-1 — P-10 Created + P-04 Timeline", () => {
  const store = new InMemoryOrderReadProjectionStore();
  const claims = new InMemoryDurableBusinessClaimStore();
  const completion = new InMemoryP10AnalyticsCompletionIdempotencyStore();
  const sources = new Map<number, OrderReadSourceContext>();
  const loader: OrderReadContextLoader = {
    loadByOrderId: vi.fn(async (id: number) => sources.get(id) ?? null),
    listOrderIdsForRestaurant: vi.fn(async () => Array.from(sources.keys())),
    listRestaurantIds: vi.fn(async () => [1]),
  };
  let materializer: OrderReadProjectionMaterializer;

  beforeEach(() => {
    store.clear();
    claims.clear();
    completion.clear();
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
      { kpiClaims: claims, completionIdempotency: completion }
    );
  });

  describe("P-10 Created", () => {
    it("increments orderCount once for a single OrderCreated", async () => {
      await materializer.adjustAnalytics(createdEnv(10, "e1"));
      const day = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-19");
      expect(day?.orderCount).toBe(1);
    });

    it("ignores duplicate OrderCreated with distinct eventIds", async () => {
      await materializer.adjustAnalytics(createdEnv(10, "e1"));
      await materializer.adjustAnalytics(createdEnv(10, "e2"));
      await Promise.all([
        materializer.adjustAnalytics(createdEnv(10, "e3")),
        materializer.adjustAnalytics(createdEnv(10, "e4")),
      ]);
      const day = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-19");
      expect(day?.orderCount).toBe(1);
    });

    it("rebuild then replay Created converges", async () => {
      sources.set(10, source(10, "served"));
      sources.set(11, source(11, "pending"));
      await materializer.rebuildRollupsForRestaurant(1);

      let day = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-19");
      expect(day?.orderCount).toBe(2);
      expect(day?.completedOrderCount).toBe(1);
      expect(day?.completedSales).toBe("10.00");

      await materializer.adjustAnalytics(createdEnv(10, "replay-10"));
      await materializer.adjustAnalytics(createdEnv(11, "replay-11"));

      day = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-19");
      expect(day?.orderCount).toBe(2);
    });
  });

  describe("P-04 Timeline", () => {
    it("writes a single Created row under distinct eventIds", async () => {
      await materializer.appendTimeline(createdEnv(10, "e1"));
      await materializer.appendTimeline(createdEnv(10, "e2"));
      const rows = await store.asRepositories().orderTimeline.listByOrderId(10, 1);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.event.eventId).toBe(timelineCreatedEventId(1, 10));
      expect(rows[0]?.event.toStatus).toBe("pending");
    });

    it("writes a single transition row under distinct eventIds", async () => {
      await materializer.appendTimeline(createdEnv(10, "c1"));
      await materializer.appendTimeline(
        statusEnv(10, "s1", "pending", "preparing")
      );
      await materializer.appendTimeline(
        statusEnv(10, "s2", "pending", "preparing")
      );
      const rows = await store.asRepositories().orderTimeline.listByOrderId(10, 1);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.event.eventId).sort()).toEqual(
        [
          timelineCreatedEventId(1, 10),
          timelineTransitionEventId(1, 10, "pending", "preparing"),
        ].sort()
      );
    });

    it("preserves occurredAt ordering across transitions", async () => {
      await materializer.appendTimeline(createdEnv(10, "c1"));
      await materializer.appendTimeline(
        statusEnv(10, "s1", "pending", "preparing")
      );
      await materializer.appendTimeline(
        statusEnv(10, "s2", "preparing", "ready")
      );
      const rows = await store.asRepositories().orderTimeline.listByOrderId(10, 1);
      expect(rows.map((r) => r.event.toStatus)).toEqual([
        "pending",
        "preparing",
        "ready",
      ]);
    });

    it("rebuild from empty then replay converges", async () => {
      sources.set(10, source(10, "ready"));
      await materializer.rebuildRollupsForRestaurant(1);

      let rows = await store.asRepositories().orderTimeline.listByOrderId(10, 1);
      expect(rows.map((r) => r.event.toStatus)).toEqual([
        "pending",
        "preparing",
        "ready",
      ]);

      await materializer.appendTimeline(createdEnv(10, "replay-c"));
      await materializer.appendTimeline(
        statusEnv(10, "replay-s", "pending", "preparing")
      );

      rows = await store.asRepositories().orderTimeline.listByOrderId(10, 1);
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.event.toStatus)).toEqual([
        "pending",
        "preparing",
        "ready",
      ]);
    });

    it("repeated rebuild converges", async () => {
      sources.set(10, source(10, "preparing"));
      await materializer.rebuildRollupsForRestaurant(1);
      await materializer.rebuildRollupsForRestaurant(1);
      const rows = await store.asRepositories().orderTimeline.listByOrderId(10, 1);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.event.toStatus)).toEqual(["pending", "preparing"]);
    });
  });
});
