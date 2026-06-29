import { describe, expect, it } from "vitest";
import { InMemoryOrderReadProjectionStore } from "../InMemoryOrderReadProjectionStore";
import type { OrderReadSourceContext } from "../../OrderReadContextLoader";

function sampleSource(overrides: Partial<OrderReadSourceContext["order"]> = {}): OrderReadSourceContext {
  return {
    order: {
      id: 42,
      restaurantId: 7,
      tableId: 3,
      tableNumber: 5,
      sessionId: null,
      customerName: "Guest",
      customerPhone: null,
      status: "pending",
      notes: null,
      totalAmount: "25.50",
      orderNumber: "ORD-0042",
      trackingToken: "track-42",
      readyPushSentAt: null,
      readyAt: null,
      whatsappSent: false,
      createdAt: "2026-06-27 10:00:00",
      updatedAt: "2026-06-27 10:00:00",
      ...overrides,
    },
    lineItems: [
      {
        id: 1,
        orderId: 42,
        menuItemId: 9,
        nameAr: "حمص",
        nameEn: "Hummus",
        price: "12.75",
        quantity: 2,
        notes: null,
        createdAt: "2026-06-27 10:00:00",
      },
    ],
    restaurantSlug: "cafe-7",
  };
}

describe("InMemoryOrderReadProjectionStore", () => {
  it("upserts owner order and retrieves by key", async () => {
    const store = new InMemoryOrderReadProjectionStore();
    const repos = store.asRepositories();
    const record = store.buildOwnerRecordFromSource(sampleSource(), "evt-1");

    await repos.ownerOrders.upsert(record);
    const found = await repos.ownerOrders.findByKey({
      restaurantId: 7,
      orderId: 42,
    });

    expect(found?.orderNumber).toBe("ORD-0042");
    expect(found?.lineItems).toHaveLength(1);
  });

  it("filters active orders for P-02", async () => {
    const store = new InMemoryOrderReadProjectionStore();
    const repos = store.asRepositories();

    await repos.ownerOrders.upsert(
      store.buildOwnerRecordFromSource(sampleSource({ status: "pending" }), "e1")
    );
    await repos.ownerOrders.upsert(
      store.buildOwnerRecordFromSource(
        sampleSource({ id: 43, status: "served", orderNumber: "ORD-0043" }),
        "e2"
      )
    );

    const active = await repos.activeOrders.findPage({ restaurantId: 7, limit: 10 });
    expect(active).toHaveLength(1);
    expect(active[0]?.status).toBe("pending");
  });

  it("stores timeline append-only rows", async () => {
    const store = new InMemoryOrderReadProjectionStore();
    const repos = store.asRepositories();

    await repos.orderTimeline.upsert({
      projectionId: "P-04-order-timeline",
      restaurantId: 7,
      orderId: 42,
      event: {
        eventId: "evt-t1",
        fromStatus: null,
        toStatus: "pending",
        occurredAt: "2026-06-27 10:00:00",
      },
      schemaVersion: 1,
      lastEventId: "evt-t1",
      updatedAt: "2026-06-27T10:00:00.000Z",
    });

    const events = await repos.orderTimeline.listByOrderId(42, 7);
    expect(events).toHaveLength(1);
  });
});
