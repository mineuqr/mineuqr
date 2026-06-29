import { describe, expect, it, vi } from "vitest";
import { InMemoryOrderReadProjectionStore } from "../../../infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import { OrderReadProjectionMaterializer } from "../OrderReadProjectionMaterializer";
import { createOrderReadProjectionConsumers } from "../../consumers/createOrderReadProjectionConsumers";
import { OrderProjectionConsumerRegistry } from "../../../infrastructure/registry/OrderProjectionConsumerRegistry";
import { InMemoryProjectionConsumerIdempotencyStore } from "../../../infrastructure/persistence/idempotency/ProjectionConsumerIdempotencyStore";
import { NoOpProjectionConsumerMetrics } from "../../../infrastructure/monitoring/OpsProjectionConsumerMetrics";
import type { OrderReadContextLoader } from "../../../infrastructure/persistence/OrderReadContextLoader";

describe("createOrderReadProjectionConsumers", () => {
  it("registers seven materializing consumers for P-01,P-02,P-03,P-04,P-06,P-10,P-11", () => {
    const store = new InMemoryOrderReadProjectionStore();
    const loader: OrderReadContextLoader = {
      loadByOrderId: vi.fn(),
      listOrderIdsForRestaurant: vi.fn(),
      listRestaurantIds: vi.fn(),
    };
    const materializer = new OrderReadProjectionMaterializer(store.asRepositories(), loader, store);
    const consumers = createOrderReadProjectionConsumers(materializer);
    expect(consumers).toHaveLength(7);
    expect(consumers.map((c) => c.projectionId)).toContain("P-06-operational-kpi");
  });

  it("dispatches materializer through registry idempotently", async () => {
    const store = new InMemoryOrderReadProjectionStore();
    const loader: OrderReadContextLoader = {
      loadByOrderId: vi.fn(async () => ({
        order: {
          id: 5,
          restaurantId: 2,
          tableId: 1,
          tableNumber: 1,
          sessionId: null,
          customerName: null,
          customerPhone: null,
          status: "pending",
          notes: null,
          totalAmount: "10.00",
          orderNumber: "ORD-5",
          trackingToken: "t",
          readyPushSentAt: null,
          readyAt: null,
          whatsappSent: false,
          createdAt: "2026-06-27 10:00:00",
          updatedAt: "2026-06-27 10:00:00",
        },
        lineItems: [],
        restaurantSlug: "r2",
      })),
      listOrderIdsForRestaurant: vi.fn(),
      listRestaurantIds: vi.fn(),
    };
    const materializer = new OrderReadProjectionMaterializer(store.asRepositories(), loader, store);
    const registry = new OrderProjectionConsumerRegistry(
      new InMemoryProjectionConsumerIdempotencyStore(),
      new NoOpProjectionConsumerMetrics()
    );
    for (const [index, consumer] of createOrderReadProjectionConsumers(materializer).entries()) {
      registry.register({
        consumer,
        enabled: true,
        registrationOrder: (index + 1) * 10,
        executionPolicy: "parallel",
      });
    }

    const env = {
      id: "o1",
      eventId: "evt-c-1",
      eventType: "OrderCreated",
      aggregateType: "Order",
      aggregateId: 5,
      aggregateVersion: null,
      restaurantId: 2,
      sequenceNumber: 1,
      occurredAt: "2026-06-27 10:00:00",
      correlationId: null,
      causationId: null,
      payloadVersion: 1,
      payload: {
        type: "OrderCreated",
        schemaVersion: 1,
        orderId: 5,
        restaurantId: 2,
        tableId: 1,
        tableNumber: 1,
        orderNumber: "ORD-5",
        trackingToken: "t",
        totalAmount: "10.00",
        lineCount: 0,
        sessionId: null,
        createdAt: "2026-06-27 10:00:00",
      },
    };

    await registry.dispatchProjections(env);
    const second = await registry.dispatchProjections(env);
    expect(second.results.every((r) => r.skipped)).toBe(true);

    const row = await store.asRepositories().ownerOrders.findByKey({
      restaurantId: 2,
      orderId: 5,
    });
    expect(row?.orderNumber).toBe("ORD-5");
  });
});
