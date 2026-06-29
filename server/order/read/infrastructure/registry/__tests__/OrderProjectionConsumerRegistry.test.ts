import { describe, expect, it, vi } from "vitest";
import type { EventEnvelope } from "../../../infrastructure/events/EventEnvelope";
import { OrderProjectionConsumerRegistry } from "../OrderProjectionConsumerRegistry";
import { InMemoryProjectionConsumerIdempotencyStore } from "../../persistence/idempotency/ProjectionConsumerIdempotencyStore";
import { NoOpProjectionConsumerMetrics } from "../../monitoring/OpsProjectionConsumerMetrics";
import type { OrderProjectionConsumer } from "../../../projections/consumers/contracts/OrderProjectionConsumer";

function envelope(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    id: "outbox-1",
    eventId: "evt-proj-1",
    eventType: "OrderCreated",
    aggregateType: "Order",
    aggregateId: 1,
    aggregateVersion: null,
    restaurantId: 1,
    sequenceNumber: 1,
    occurredAt: "2026-06-27 10:00:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: { type: "OrderCreated" },
    ...overrides,
  };
}

function makeProjectionConsumer(
  name: OrderProjectionConsumer["name"],
  projectionId: OrderProjectionConsumer["projectionId"],
  handle: OrderProjectionConsumer["handle"],
  eventTypes: string[]
): OrderProjectionConsumer {
  return { name, projectionId, subscribedEventTypes: eventTypes, handle };
}

describe("OrderProjectionConsumerRegistry", () => {
  it("dispatches to subscribed enabled projection consumers with failure isolation", async () => {
    const calls: string[] = [];
    const registry = new OrderProjectionConsumerRegistry(
      new InMemoryProjectionConsumerIdempotencyStore(),
      new NoOpProjectionConsumerMetrics()
    );

    registry.register({
      consumer: makeProjectionConsumer(
        "ActiveOrdersProjectionConsumer",
        "P-02-active-orders",
        vi.fn(async () => {
          calls.push("active");
        }),
        ["OrderCreated"]
      ),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    registry.register({
      consumer: makeProjectionConsumer(
        "OperationalKpiProjectionConsumer",
        "P-06-operational-kpi",
        vi.fn(async () => {
          calls.push("kpi");
        }),
        ["OrderCreated"]
      ),
      enabled: true,
      registrationOrder: 20,
      executionPolicy: "parallel",
    });

    const result = await registry.dispatchProjections(envelope());

    expect(calls).toContain("active");
    expect(calls).toContain("kpi");
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.success)).toBe(true);
  });

  it("skips disabled projection consumers", async () => {
    const handle = vi.fn();
    const registry = new OrderProjectionConsumerRegistry(
      new InMemoryProjectionConsumerIdempotencyStore(),
      new NoOpProjectionConsumerMetrics()
    );

    registry.register({
      consumer: makeProjectionConsumer(
        "OwnerOrdersProjectionConsumer",
        "P-01-owner-orders",
        handle,
        ["OrderCreated"]
      ),
      enabled: false,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    const result = await registry.dispatchProjections(envelope());
    expect(handle).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(0);
  });

  it("skips duplicate event deliveries idempotently", async () => {
    const handle = vi.fn();
    const idempotency = new InMemoryProjectionConsumerIdempotencyStore();
    const registry = new OrderProjectionConsumerRegistry(
      idempotency,
      new NoOpProjectionConsumerMetrics()
    );

    registry.register({
      consumer: makeProjectionConsumer(
        "OrderDetailsProjectionConsumer",
        "P-03-order-details",
        handle,
        ["OrderCreated"]
      ),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    await registry.dispatchProjections(envelope());
    const second = await registry.dispatchProjections(envelope());

    expect(handle).toHaveBeenCalledTimes(1);
    expect(second.results[0]?.skipped).toBe(true);
  });

  it("isolates projection consumer failures", async () => {
    const ok = vi.fn();
    const registry = new OrderProjectionConsumerRegistry(
      new InMemoryProjectionConsumerIdempotencyStore(),
      new NoOpProjectionConsumerMetrics()
    );

    registry.register({
      consumer: makeProjectionConsumer(
        "ActiveOrdersProjectionConsumer",
        "P-02-active-orders",
        vi.fn(async () => {
          throw new Error("projection failed");
        }),
        ["OrderCreated"]
      ),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    registry.register({
      consumer: makeProjectionConsumer(
        "PublicOrderStatusProjectionConsumer",
        "P-11-public-order-status",
        ok,
        ["OrderCreated"]
      ),
      enabled: true,
      registrationOrder: 20,
      executionPolicy: "parallel",
    });

    const result = await registry.dispatchProjections(envelope());

    expect(ok).toHaveBeenCalled();
    expect(result.results.some((r) => !r.success)).toBe(true);
    expect(result.results.some((r) => r.success && !r.skipped)).toBe(true);
  });
});
