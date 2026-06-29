import { describe, expect, it, vi, beforeEach } from "vitest";
import { InMemoryOrderReadProjectionStore } from "../../persistence/inmemory/InMemoryOrderReadProjectionStore";
import { OrderReadProjectionMaterializer } from "../../../projections/materializers/OrderReadProjectionMaterializer";
import { OrderReadProjectionBackfillService } from "../OrderReadProjectionBackfillService";
import { DrizzleOrderReadProjectionStore } from "../../persistence/drizzle/DrizzleOrderReadProjectionStore";
import type { OrderReadContextLoader } from "../../persistence/OrderReadContextLoader";

vi.mock("../../../../db", () => ({
  getDb: vi.fn(async () => null),
}));

describe("OrderReadProjectionBackfillService", () => {
  const store = new InMemoryOrderReadProjectionStore();
  let loader: OrderReadContextLoader;

  beforeEach(() => {
    store.clear();
    loader = {
      loadByOrderId: vi.fn(async (orderId: number) => ({
        order: {
          id: orderId,
          restaurantId: 99,
          tableId: 1,
          tableNumber: 2,
          sessionId: null,
          customerName: null,
          customerPhone: null,
          status: "pending",
          notes: null,
          totalAmount: "15.00",
          orderNumber: `ORD-${orderId}`,
          trackingToken: `tok-${orderId}`,
          readyPushSentAt: null,
          readyAt: null,
          whatsappSent: false,
          createdAt: "2026-06-15 08:00:00",
          updatedAt: "2026-06-15 08:00:00",
        },
        lineItems: [],
        restaurantSlug: "tenant-99",
      })),
      listOrderIdsForRestaurant: vi.fn(async () => [1, 2]),
      listRestaurantIds: vi.fn(async () => [99]),
    };
  });

  function service(): OrderReadProjectionBackfillService {
    const materializer = new OrderReadProjectionMaterializer(
      store.asRepositories(),
      loader,
      store
    );
    return new OrderReadProjectionBackfillService(
      loader,
      new DrizzleOrderReadProjectionStore(),
      materializer
    );
  }

  it("runs tenant rebuild and materializes orders", async () => {
    const result = await service().run({ scope: "tenant", restaurantId: 99 });
    expect(result.status).toBe("completed");
    expect(result.rowsProcessed).toBe(2);

    const row = await store.asRepositories().ownerOrders.findByKey({
      restaurantId: 99,
      orderId: 1,
    });
    expect(row?.orderNumber).toBe("ORD-1");
  });

  it("supports partial rebuild by day range", async () => {
    const result = await service().run({
      scope: "partial",
      restaurantId: 99,
      fromDayKey: "2026-06-15",
      toDayKey: "2026-06-15",
    });
    expect(result.rowsProcessed).toBe(2);
  });

  it("retries safely without throwing", async () => {
    const svc = service();
    const first = await svc.run({ scope: "tenant", restaurantId: 99 });
    const retry = await svc.retry(first.id, { scope: "tenant", restaurantId: 99 });
    expect(retry.status).toBe("completed");
    expect(retry.rowsProcessed).toBe(2);
  });
});
