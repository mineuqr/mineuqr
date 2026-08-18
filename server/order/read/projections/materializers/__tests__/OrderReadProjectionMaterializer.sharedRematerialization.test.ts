import { describe, expect, it, vi } from "vitest";
import type { EventEnvelope } from "../../../../infrastructure/events/EventEnvelope";
import type { DrizzleBusinessIdentityAllocator } from "../../../../business-identity/infrastructure/DrizzleBusinessIdentityAllocator";
import { InMemoryOrderReadProjectionStore } from "../../../infrastructure/persistence/inmemory/InMemoryOrderReadProjectionStore";
import type {
  OrderReadContextLoader,
  OrderReadSourceContext,
} from "../../../infrastructure/persistence/OrderReadContextLoader";
import { InMemoryProjectionConsumerIdempotencyStore } from "../../../infrastructure/persistence/idempotency/ProjectionConsumerIdempotencyStore";
import { NoOpProjectionConsumerMetrics } from "../../../infrastructure/monitoring/OpsProjectionConsumerMetrics";
import { OrderProjectionConsumerRegistry } from "../../../infrastructure/registry/OrderProjectionConsumerRegistry";
import { createOrderReadProjectionConsumers } from "../../consumers/createOrderReadProjectionConsumers";
import { OrderReadProjectionMaterializer } from "../OrderReadProjectionMaterializer";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      identityScope: null,
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

function lifecycleEnvelope(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    id: "outbox-1",
    eventId: "evt-lifecycle-1",
    eventType: "OrderLifecycleStageChanged",
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
      type: "OrderLifecycleStageChanged",
      schemaVersion: 1,
      orderId: 10,
      restaurantId: 1,
      fromStage: "active",
      toStage: "completed",
      changedAt: "2026-06-27 12:00:00",
    },
    ...overrides,
  };
}

function makeMaterializer(options?: {
  ensureAssigned?: ReturnType<typeof vi.fn>;
  upsertOwner?: ReturnType<typeof vi.fn>;
}) {
  const store = new InMemoryOrderReadProjectionStore();
  const inner = store.asRepositories();
  const upsertOwner =
    options?.upsertOwner ??
    vi.fn(async (record: Parameters<typeof inner.ownerOrders.upsert>[0]) => {
      await delay(20);
      return inner.ownerOrders.upsert(record);
    });
  const repos = {
    ...inner,
    ownerOrders: {
      ...inner.ownerOrders,
      upsert: upsertOwner,
    },
  };
  const loader: OrderReadContextLoader = {
    loadByOrderId: vi.fn(async () => source()),
    listOrderIdsForRestaurant: vi.fn(async () => [10]),
    listRestaurantIds: vi.fn(async () => [1]),
  };
  const ensureAssigned =
    options?.ensureAssigned ??
    vi.fn(async () => {
      await delay(20);
    });
  const allocator = { ensureAssigned } as unknown as DrizzleBusinessIdentityAllocator;
  const materializer = new OrderReadProjectionMaterializer(repos, loader, store, undefined, {
    businessIdentityAllocator: allocator,
  });
  return { materializer, ensureAssigned, upsertOwner, store };
}

describe("ORDER-PROJECTION-FANOUT-REMEDIATION-1 shared rematerialization", () => {
  it("runs historic ensureAssigned and owner persist once for four parallel callers", async () => {
    const { materializer, ensureAssigned, upsertOwner } = makeMaterializer();

    await Promise.all([
      materializer.ensureSharedOrderRematerialized(10, "evt-lifecycle-1"),
      materializer.ensureSharedOrderRematerialized(10, "evt-lifecycle-1"),
      materializer.ensureSharedOrderRematerialized(10, "evt-lifecycle-1"),
      materializer.ensureSharedOrderRematerialized(10, "evt-lifecycle-1"),
    ]);

    expect(ensureAssigned).toHaveBeenCalledTimes(1);
    expect(upsertOwner).toHaveBeenCalledTimes(1);
  });

  it("keeps four RA-06 consumers and rematerializes once on OrderLifecycleStageChanged", async () => {
    const { materializer, ensureAssigned, upsertOwner } = makeMaterializer();
    const idempotency = new InMemoryProjectionConsumerIdempotencyStore();
    const registry = new OrderProjectionConsumerRegistry(
      idempotency,
      new NoOpProjectionConsumerMetrics()
    );
    const consumers = createOrderReadProjectionConsumers(materializer);
    const rematerializing = consumers.filter((c) =>
      ["P-01-owner-orders", "P-02-active-orders", "P-03-order-details", "P-11-public-order-status"].includes(
        c.projectionId
      )
    );
    expect(rematerializing).toHaveLength(4);

    for (const [index, consumer] of consumers.entries()) {
      registry.register({
        consumer,
        enabled: true,
        registrationOrder: (index + 1) * 10,
        executionPolicy: "parallel",
      });
    }

    const result = await registry.dispatchProjections(lifecycleEnvelope());
    const rematerializeResults = result.results.filter((r) =>
      [
        "OwnerOrdersProjectionConsumer",
        "ActiveOrdersProjectionConsumer",
        "OrderDetailsProjectionConsumer",
        "PublicOrderStatusProjectionConsumer",
      ].includes(r.consumerName)
    );

    expect(rematerializeResults).toHaveLength(4);
    expect(rematerializeResults.every((r) => r.success && !r.skipped)).toBe(true);
    expect(ensureAssigned).toHaveBeenCalledTimes(1);
    expect(upsertOwner).toHaveBeenCalledTimes(1);

    expect(
      await idempotency.hasProcessed("OwnerOrdersProjectionConsumer", "evt-lifecycle-1")
    ).toBe(true);
    expect(
      await idempotency.hasProcessed("ActiveOrdersProjectionConsumer", "evt-lifecycle-1")
    ).toBe(true);
    expect(
      await idempotency.hasProcessed("OrderDetailsProjectionConsumer", "evt-lifecycle-1")
    ).toBe(true);
    expect(
      await idempotency.hasProcessed("PublicOrderStatusProjectionConsumer", "evt-lifecycle-1")
    ).toBe(true);
  });

  it("fails all rematerializing consumers together and does not mark them processed", async () => {
    const persistError = new Error("shared persist failed");
    const { materializer, ensureAssigned, upsertOwner } = makeMaterializer({
      upsertOwner: vi.fn(async () => {
        await delay(20);
        throw persistError;
      }),
    });
    const idempotency = new InMemoryProjectionConsumerIdempotencyStore();
    const registry = new OrderProjectionConsumerRegistry(
      idempotency,
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

    const result = await registry.dispatchProjections(lifecycleEnvelope());
    const rematerializeResults = result.results.filter((r) =>
      [
        "OwnerOrdersProjectionConsumer",
        "ActiveOrdersProjectionConsumer",
        "OrderDetailsProjectionConsumer",
        "PublicOrderStatusProjectionConsumer",
      ].includes(r.consumerName)
    );
    const kpi = result.results.find((r) => r.consumerName === "OperationalKpiProjectionConsumer");

    expect(ensureAssigned).toHaveBeenCalledTimes(1);
    expect(upsertOwner).toHaveBeenCalledTimes(1);
    expect(rematerializeResults).toHaveLength(4);
    expect(rematerializeResults.every((r) => !r.success && r.error === "shared persist failed")).toBe(
      true
    );
    expect(kpi?.success).toBe(true);
    expect(
      await idempotency.hasProcessed("OwnerOrdersProjectionConsumer", "evt-lifecycle-1")
    ).toBe(false);
    expect(
      await idempotency.hasProcessed("ActiveOrdersProjectionConsumer", "evt-lifecycle-1")
    ).toBe(false);
    expect(
      await idempotency.hasProcessed("OperationalKpiProjectionConsumer", "evt-lifecycle-1")
    ).toBe(true);
  });

  it("does not collapse rematerialization across distinct eventIds", async () => {
    const { materializer, ensureAssigned, upsertOwner } = makeMaterializer();

    await Promise.all([
      materializer.ensureSharedOrderRematerialized(10, "evt-a"),
      materializer.ensureSharedOrderRematerialized(10, "evt-b"),
    ]);

    expect(ensureAssigned).toHaveBeenCalledTimes(2);
    expect(upsertOwner).toHaveBeenCalledTimes(2);
  });

  it("does not share the in-flight gate across materializer instances", async () => {
    const a = makeMaterializer();
    const b = makeMaterializer();

    await Promise.all([
      a.materializer.ensureSharedOrderRematerialized(10, "evt-same"),
      b.materializer.ensureSharedOrderRematerialized(10, "evt-same"),
    ]);

    expect(a.ensureAssigned).toHaveBeenCalledTimes(1);
    expect(b.ensureAssigned).toHaveBeenCalledTimes(1);
  });
});
