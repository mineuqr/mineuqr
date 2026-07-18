import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveNormalizedOpeningHours } from "@shared/utils/businessDay";
import { InMemoryOrderReadProjectionStore } from "../../../infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import { OrderReadProjectionMaterializer } from "../OrderReadProjectionMaterializer";
import type {
  OrderReadContextLoader,
  OrderReadSourceContext,
} from "../../../infrastructure/persistence/OrderReadContextLoader";

vi.mock("../../../../business-identity/infrastructure/RestaurantOpeningTimeResolver", () => ({
  restaurantOpeningTimeResolver: {
    getWorkingHours: vi.fn(async () => resolveNormalizedOpeningHours(null)),
  },
}));

function orderSource(
  id: number,
  createdAt: string,
  status = "served"
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
      totalAmount: "10.00",
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

describe("REPORTING-BUSINESS-DAY-BACKFILL-1 — rollup rebuild", () => {
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

  it("removes stale UTC dayKeys and writes Business Day keys", async () => {
    // Pre-open wall time: 22:00 UTC 15th = 01:00 Riyadh 16th → BD 2026-07-15
    sources.set(1, orderSource(1, "2026-07-15 22:00:00"));

    // Stale UTC-calendar orphan from pre-adoption materialization
    await store.asRepositories().orderAnalytics.upsert({
      projectionId: "P-10-analytics",
      restaurantId: 1,
      dayKey: "2026-07-15", // wrong if it was UTC slice of 22:00 → would be 15; place orphan 16
      orderCount: 99,
      completedOrderCount: 99,
      completedSales: "999.00",
      schemaVersion: 1,
      lastEventId: null,
      updatedAt: new Date().toISOString(),
    });
    await store.asRepositories().orderAnalytics.upsert({
      projectionId: "P-10-analytics",
      restaurantId: 1,
      dayKey: "2026-07-16",
      orderCount: 99,
      completedOrderCount: 99,
      completedSales: "999.00",
      schemaVersion: 1,
      lastEventId: null,
      updatedAt: new Date().toISOString(),
    });

    const result = await materializer.rebuildRollupsForRestaurant(1);
    expect(result.ordersScanned).toBe(1);
    expect(result.dayKeysWritten).toBe(1);

    const bd = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-15");
    expect(bd?.orderCount).toBe(1);
    expect(bd?.completedSales).toBe("10.00");

    const orphan = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-16");
    expect(orphan).toBeNull();
  });

  it("scans all write-model orders (not findPage 100 clamp)", async () => {
    for (let i = 1; i <= 120; i++) {
      sources.set(i, orderSource(i, "2026-07-16 12:00:00"));
    }
    const result = await materializer.rebuildRollupsForRestaurant(1);
    expect(result.ordersScanned).toBe(120);
    const day = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-16");
    expect(day?.orderCount).toBe(120);
  });

  it("is idempotent across re-runs", async () => {
    sources.set(1, orderSource(1, "2026-07-16 12:00:00"));
    await materializer.rebuildRollupsForRestaurant(1);
    await materializer.rebuildRollupsForRestaurant(1);
    const day = await store.asRepositories().orderAnalytics.getDay(1, "2026-07-16");
    expect(day?.orderCount).toBe(1);
    expect(day?.completedSales).toBe("10.00");
  });
});
