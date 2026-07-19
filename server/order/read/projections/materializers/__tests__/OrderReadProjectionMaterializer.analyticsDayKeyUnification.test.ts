/**
 * REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1
 * Incremental adjustAnalytics === rebuildRollupsForRestaurant for P-10.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveNormalizedOpeningHours } from "@shared/utils/businessDay";
import type { EventEnvelope } from "../../../../infrastructure/events/EventEnvelope";
import { InMemoryOrderReadProjectionStore } from "../../../infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import type {
  OrderReadContextLoader,
  OrderReadSourceContext,
} from "../../../infrastructure/persistence/OrderReadContextLoader";
import { OrderReadProjectionMaterializer } from "../OrderReadProjectionMaterializer";
import { orderAnalyticsBusinessDayKey } from "../orderAnalyticsDayKey";

vi.mock("../../../../business-identity/infrastructure/RestaurantOpeningTimeResolver", () => ({
  restaurantOpeningTimeResolver: {
    getWorkingHours: vi.fn(async () => resolveNormalizedOpeningHours(null)),
  },
}));

const HOURS = resolveNormalizedOpeningHours(null);

function orderSource(
  id: number,
  createdAt: string,
  status: string,
  totalAmount = "25.00"
): OrderReadSourceContext {
  return {
    order: {
      id,
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
      identityScope: null,
      customerPhone: null,
      status,
      lifecycleStage: status === "served" ? "completed" : "active",
      notes: null,
      totalAmount,
      orderNumber: `ORD-${id}`,
      trackingToken: `tok-${id}`,
      readyPushSentAt: null,
      readyAt: null,
      whatsappSent: false,
      createdAt,
      updatedAt: createdAt,
    },
    lineItems: [],
    restaurantSlug: "slug-1",
  };
}

function baseEnvelope(
  overrides: Partial<EventEnvelope> & { payload: EventEnvelope["payload"] }
): EventEnvelope {
  return {
    id: "outbox-1",
    eventId: "evt-1",
    eventType: "OrderCreated",
    aggregateType: "Order",
    aggregateId: 1,
    aggregateVersion: null,
    restaurantId: 1,
    sequenceNumber: 1,
    occurredAt: "2026-07-16 12:00:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    ...overrides,
  };
}

describe("REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1", () => {
  const store = new InMemoryOrderReadProjectionStore();
  let sources: Map<number, OrderReadSourceContext>;
  let loader: OrderReadContextLoader;
  let materializer: OrderReadProjectionMaterializer;

  beforeEach(() => {
    store.clear();
    sources = new Map();
    loader = {
      loadByOrderId: vi.fn(async (orderId: number) => sources.get(orderId) ?? null),
      listOrderIdsForRestaurant: vi.fn(async () => Array.from(sources.keys())),
      listRestaurantIds: vi.fn(async () => [1]),
    };
    materializer = new OrderReadProjectionMaterializer(
      store.asRepositories(),
      loader,
      store
    );
  });

  it("orderAnalyticsBusinessDayKey uses createdAt — not servedAt", () => {
    const created = "2026-07-15 22:00:00"; // BD 2026-07-15 (default 09:00 open)
    const served = "2026-07-16 10:00:00"; // BD 2026-07-16
    expect(orderAnalyticsBusinessDayKey(created, HOURS)).toBe("2026-07-15");
    expect(orderAnalyticsBusinessDayKey(created, HOURS)).not.toBe(
      orderAnalyticsBusinessDayKey(served, HOURS)
    );
  });

  it("late OrderCompleted attributes sales to creation Business Day (not servedAt)", async () => {
    const createdAt = "2026-07-15 22:00:00"; // BD 2026-07-15
    const servedAt = "2026-07-16 10:00:00"; // BD 2026-07-16
    sources.set(1, orderSource(1, createdAt, "served", "40.00"));

    await materializer.adjustAnalytics(
      baseEnvelope({
        eventId: "evt-create",
        eventType: "OrderCreated",
        occurredAt: createdAt,
        payload: {
          type: "OrderCreated",
          schemaVersion: 1,
          orderId: 1,
          restaurantId: 1,
          tableId: 2,
          tableNumber: 4,
          orderNumber: "ORD-1",
          trackingToken: "tok-1",
          totalAmount: "40.00",
          lineCount: 0,
          sessionId: null,
          createdAt,
        },
      })
    );

    await materializer.adjustAnalytics(
      baseEnvelope({
        eventId: "evt-complete",
        eventType: "OrderCompleted",
        occurredAt: servedAt,
        aggregateId: 1,
        payload: {
          type: "OrderCompleted",
          schemaVersion: 1,
          orderId: 1,
          servedAt,
        },
      })
    );

    const createDay = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-15");
    const serveDay = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-16");

    expect(createDay?.orderCount).toBe(1);
    expect(createDay?.completedOrderCount).toBe(1);
    expect(createDay?.completedSales).toBe("40.00");
    expect(serveDay).toBeNull();
  });

  it("incremental event stream equals rebuild for mixed late completions", async () => {
    const rows: Array<{
      id: number;
      createdAt: string;
      servedAt: string;
      amount: string;
      status: string;
    }> = [
      {
        id: 1,
        createdAt: "2026-07-16 12:00:00",
        servedAt: "2026-07-16 13:00:00",
        amount: "10.00",
        status: "served",
      },
      {
        id: 2,
        createdAt: "2026-07-15 22:30:00",
        servedAt: "2026-07-16 11:00:00",
        amount: "30.00",
        status: "served",
      },
      {
        id: 3,
        createdAt: "2026-07-16 14:00:00",
        servedAt: "",
        amount: "5.00",
        status: "cancelled",
      },
    ];

    for (const r of rows) {
      sources.set(r.id, orderSource(r.id, r.createdAt, r.status, r.amount));
    }

    // Incremental path
    for (const r of rows) {
      await materializer.adjustAnalytics(
        baseEnvelope({
          eventId: `c-${r.id}`,
          eventType: "OrderCreated",
          occurredAt: r.createdAt,
          aggregateId: r.id,
          payload: {
            type: "OrderCreated",
            schemaVersion: 1,
            orderId: r.id,
            restaurantId: 1,
            tableId: 2,
            tableNumber: 4,
            orderNumber: `ORD-${r.id}`,
            trackingToken: `tok-${r.id}`,
            totalAmount: r.amount,
            lineCount: 0,
            sessionId: null,
            createdAt: r.createdAt,
          },
        })
      );
      if (r.status === "served") {
        await materializer.adjustAnalytics(
          baseEnvelope({
            eventId: `s-${r.id}`,
            eventType: "OrderCompleted",
            occurredAt: r.servedAt,
            aggregateId: r.id,
            payload: {
              type: "OrderCompleted",
              schemaVersion: 1,
              orderId: r.id,
              servedAt: r.servedAt,
            },
          })
        );
      }
    }

    const incremental = {
      d15: await store.asRepositories().orderAnalytics.getDay(1, "2026-07-15"),
      d16: await store.asRepositories().orderAnalytics.getDay(1, "2026-07-16"),
    };

    // Rebuild path (wipe + rewrite)
    await materializer.rebuildRollupsForRestaurant(1);

    const rebuilt = {
      d15: await store.asRepositories().orderAnalytics.getDay(1, "2026-07-15"),
      d16: await store.asRepositories().orderAnalytics.getDay(1, "2026-07-16"),
    };

    expect(rebuilt.d15).toEqual(
      expect.objectContaining({
        orderCount: incremental.d15?.orderCount,
        completedOrderCount: incremental.d15?.completedOrderCount,
        completedSales: incremental.d15?.completedSales,
      })
    );
    expect(rebuilt.d16).toEqual(
      expect.objectContaining({
        orderCount: incremental.d16?.orderCount,
        completedOrderCount: incremental.d16?.completedOrderCount,
        completedSales: incremental.d16?.completedSales,
      })
    );

    // Explicit expected totals under createdAt ownership
    expect(rebuilt.d15?.orderCount).toBe(1);
    expect(rebuilt.d15?.completedOrderCount).toBe(1);
    expect(rebuilt.d15?.completedSales).toBe("30.00");
    expect(rebuilt.d16?.orderCount).toBe(2);
    expect(rebuilt.d16?.completedOrderCount).toBe(1);
    expect(rebuilt.d16?.completedSales).toBe("10.00");
    // Invariant
    expect(rebuilt.d15!.completedOrderCount).toBeLessThanOrEqual(rebuilt.d15!.orderCount);
    expect(rebuilt.d16!.completedOrderCount).toBeLessThanOrEqual(rebuilt.d16!.orderCount);
  });

  it("rebuild is idempotent after incremental late completions", async () => {
    sources.set(1, orderSource(1, "2026-07-15 22:00:00", "served", "12.00"));
    await materializer.adjustAnalytics(
      baseEnvelope({
        eventId: "c1",
        eventType: "OrderCreated",
        occurredAt: "2026-07-15 22:00:00",
        payload: {
          type: "OrderCreated",
          schemaVersion: 1,
          orderId: 1,
          restaurantId: 1,
          tableId: 2,
          tableNumber: 4,
          orderNumber: "ORD-1",
          trackingToken: "tok-1",
          totalAmount: "12.00",
          lineCount: 0,
          sessionId: null,
          createdAt: "2026-07-15 22:00:00",
        },
      })
    );
    await materializer.adjustAnalytics(
      baseEnvelope({
        eventId: "s1",
        eventType: "OrderCompleted",
        occurredAt: "2026-07-16 10:00:00",
        payload: {
          type: "OrderCompleted",
          schemaVersion: 1,
          orderId: 1,
          servedAt: "2026-07-16 10:00:00",
        },
      })
    );

    await materializer.rebuildRollupsForRestaurant(1);
    await materializer.rebuildRollupsForRestaurant(1);

    const day = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-15");
    expect(day?.orderCount).toBe(1);
    expect(day?.completedOrderCount).toBe(1);
    expect(day?.completedSales).toBe("12.00");
    expect(await store.asRepositories().orderAnalytics.getDay(1, "2026-07-16")).toBeNull();
  });
});
