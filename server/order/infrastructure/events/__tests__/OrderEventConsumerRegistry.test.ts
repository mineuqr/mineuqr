import { describe, expect, it, vi } from "vitest";
import type { EventEnvelope } from "../../EventEnvelope";
import { OrderEventConsumerRegistry } from "../registry/OrderEventConsumerRegistry";
import { InMemoryConsumerIdempotencyStore } from "../consumers/idempotency/ConsumerIdempotencyStore";
import { NoOpEventConsumerMetrics } from "../monitoring/OpsEventConsumerMetrics";
import type { OrderEventConsumer } from "../../consumers/contracts/OrderEventConsumer";

function envelope(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    id: "outbox-1",
    eventId: "evt-1",
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

function makeConsumer(
  name: OrderEventConsumer["name"],
  handle: OrderEventConsumer["handle"],
  eventTypes: string[]
): OrderEventConsumer {
  return { name, subscribedEventTypes: eventTypes, handle };
}

describe("OrderEventConsumerRegistry", () => {
  it("dispatches to subscribed enabled consumers in parallel with failure isolation", async () => {
    const calls: string[] = [];
    const registry = new OrderEventConsumerRegistry(
      new InMemoryConsumerIdempotencyStore(),
      new NoOpEventConsumerMetrics()
    );

    registry.register({
      consumer: makeConsumer(
        "OrderNotificationConsumer",
        vi.fn(async () => {
          calls.push("notification");
        }),
        ["OrderCreated"]
      ),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    registry.register({
      consumer: makeConsumer(
        "OrderSessionConsumer",
        vi.fn(async () => {
          calls.push("session");
        }),
        ["OrderCreated"]
      ),
      enabled: true,
      registrationOrder: 20,
      executionPolicy: "parallel",
    });

    const result = await registry.dispatch(envelope());

    expect(calls).toContain("notification");
    expect(calls).toContain("session");
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.success)).toBe(true);
  });

  it("skips disabled consumers", async () => {
    const handle = vi.fn();
    const registry = new OrderEventConsumerRegistry(
      new InMemoryConsumerIdempotencyStore(),
      new NoOpEventConsumerMetrics()
    );

    registry.register({
      consumer: makeConsumer("OrderKitchenConsumer", handle, ["OrderCreated"]),
      enabled: false,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    await registry.dispatch(envelope());
    expect(handle).not.toHaveBeenCalled();
  });

  it("isolates failures — one consumer error does not stop others", async () => {
    const ok = vi.fn();
    const registry = new OrderEventConsumerRegistry(
      new InMemoryConsumerIdempotencyStore(),
      new NoOpEventConsumerMetrics()
    );

    registry.register({
      consumer: makeConsumer(
        "OrderNotificationConsumer",
        vi.fn(async () => {
          throw new Error("notification failed");
        }),
        ["OrderCreated"]
      ),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    registry.register({
      consumer: makeConsumer("OrderSessionConsumer", ok, ["OrderCreated"]),
      enabled: true,
      registrationOrder: 20,
      executionPolicy: "parallel",
    });

    const result = await registry.dispatch(envelope());

    expect(ok).toHaveBeenCalled();
    expect(result.results.find((r) => r.consumerName === "OrderNotificationConsumer")?.success).toBe(
      false
    );
    expect(result.results.find((r) => r.consumerName === "OrderSessionConsumer")?.success).toBe(
      true
    );
  });

  it("enforces idempotency per consumer and eventId", async () => {
    const handle = vi.fn();
    const registry = new OrderEventConsumerRegistry(
      new InMemoryConsumerIdempotencyStore(),
      new NoOpEventConsumerMetrics()
    );

    registry.register({
      consumer: makeConsumer("OrderPrintingConsumer", handle, ["OrderCreated"]),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    const env = envelope();
    await registry.dispatch(env);
    await registry.dispatch(env);

    expect(handle).toHaveBeenCalledTimes(1);
  });
});
