import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveNormalizedOpeningHours } from "@shared/utils/businessDay";
import { InMemoryOrderReadProjectionStore } from "../../persistence/inmemory/InMemoryOrderReadProjectionStore";
import { OrderReadProjectionMaterializer } from "../../../projections/materializers/OrderReadProjectionMaterializer";
import { OrderReadBusinessDayRollupBackfillService } from "../OrderReadBusinessDayRollupBackfillService";
import type {
  OrderReadContextLoader,
  OrderReadSourceContext,
} from "../../persistence/OrderReadContextLoader";

vi.mock("../../../../../db", () => ({
  getDb: vi.fn(async () => null),
}));

vi.mock("../../../../business-identity/infrastructure/RestaurantOpeningTimeResolver", () => ({
  restaurantOpeningTimeResolver: {
    getWorkingHours: vi.fn(async () => resolveNormalizedOpeningHours(null)),
  },
}));

function source(orderId: number): OrderReadSourceContext {
  return {
    order: {
      id: orderId,
      restaurantId: 42,
      tableId: 1,
      tableNumber: 1,
      sessionId: null,
      serviceMode: "table_service",
      fulfilmentAnchorType: "table",
      fulfilmentLabel: "1",
      customerName: null,
      businessDay: null,
      dailyDisplayNumber: null,
      identityScope: null,
      customerPhone: null,
      status: "served",
      lifecycleStage: "completed",
      notes: null,
      totalAmount: "5.00",
      orderNumber: `ORD-${orderId}`,
      trackingToken: `tok-${orderId}`,
      readyPushSentAt: null,
      readyAt: null,
      whatsappSent: false,
      createdAt: "2026-07-16 12:00:00",
      updatedAt: "2026-07-16 12:00:00",
    },
    lineItems: [],
    restaurantSlug: "tenant-42",
  };
}

describe("OrderReadBusinessDayRollupBackfillService", () => {
  const store = new InMemoryOrderReadProjectionStore();
  let loader: OrderReadContextLoader;

  beforeEach(() => {
    store.clear();
    loader = {
      loadByOrderId: vi.fn(async (id: number) => source(id)),
      listOrderIdsForRestaurant: vi.fn(async () => [1, 2, 3]),
      listRestaurantIds: vi.fn(async () => [42]),
    };
  });

  function service(): OrderReadBusinessDayRollupBackfillService {
    const materializer = new OrderReadProjectionMaterializer(
      store.asRepositories(),
      loader,
      store
    );
    return new OrderReadBusinessDayRollupBackfillService(loader, materializer);
  }

  it("rebuilds tenant rollups and reports scan counts", async () => {
    const run = await service().run({ scope: "tenant", restaurantId: 42 });
    expect(run.status).toBe("completed");
    expect(run.restaurantsProcessed).toBe(1);
    expect(run.ordersScanned).toBe(3);
    expect(run.dayKeysWritten).toBe(1);

    const day = await store.asRepositories().orderAnalytics.getDay(42, "2026-07-16");
    expect(day?.orderCount).toBe(3);
  });

  it("requires restaurantId for tenant scope", async () => {
    await expect(service().run({ scope: "tenant" })).rejects.toThrow(
      /restaurantId required/
    );
  });
});
