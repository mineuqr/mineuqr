import { describe, expect, it, vi } from "vitest";
import type { EventEnvelope } from "../../../../infrastructure/events/EventEnvelope";
import { OrderEventConsumerRegistry } from "../../../../infrastructure/events/registry/OrderEventConsumerRegistry";
import { InMemoryConsumerIdempotencyStore } from "../../../../infrastructure/events/consumers/idempotency/ConsumerIdempotencyStore";
import { NoOpEventConsumerMetrics } from "../../../../infrastructure/events/monitoring/OpsEventConsumerMetrics";
import type { OrderEventConsumer } from "../../../../infrastructure/events/consumers/contracts/OrderEventConsumer";
import { OrderProjectionConsumerRegistry } from "../OrderProjectionConsumerRegistry";
import { InMemoryProjectionConsumerIdempotencyStore } from "../../persistence/idempotency/ProjectionConsumerIdempotencyStore";
import { NoOpProjectionConsumerMetrics } from "../../monitoring/OpsProjectionConsumerMetrics";
import { CompositeEventDispatchDelegate } from "../CompositeEventDispatchDelegate";
import type { OrderProjectionConsumer } from "../../../projections/consumers/contracts/OrderProjectionConsumer";

function envelope(): EventEnvelope {
  return {
    id: "outbox-1",
    eventId: "evt-composite-1",
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
  };
}

function makeIntegrationConsumer(
  name: OrderEventConsumer["name"],
  handle: OrderEventConsumer["handle"]
): OrderEventConsumer {
  return { name, subscribedEventTypes: ["OrderCreated"], handle };
}

function makeProjectionConsumer(
  name: OrderProjectionConsumer["name"],
  handle: OrderProjectionConsumer["handle"]
): OrderProjectionConsumer {
  return {
    name,
    projectionId: "P-02-active-orders",
    subscribedEventTypes: ["OrderCreated"],
    handle,
  };
}

describe("CompositeEventDispatchDelegate", () => {
  it("runs integration and projection registries independently", async () => {
    const integrationCalls: string[] = [];
    const projectionCalls: string[] = [];

    const integrationRegistry = new OrderEventConsumerRegistry(
      new InMemoryConsumerIdempotencyStore(),
      new NoOpEventConsumerMetrics()
    );
    integrationRegistry.register({
      consumer: makeIntegrationConsumer(
        "OrderNotificationConsumer",
        vi.fn(async () => {
          integrationCalls.push("notification");
        })
      ),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    const projectionRegistry = new OrderProjectionConsumerRegistry(
      new InMemoryProjectionConsumerIdempotencyStore(),
      new NoOpProjectionConsumerMetrics()
    );
    projectionRegistry.register({
      consumer: makeProjectionConsumer(
        "ActiveOrdersProjectionConsumer",
        vi.fn(async () => {
          projectionCalls.push("active");
        })
      ),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    const composite = new CompositeEventDispatchDelegate(
      integrationRegistry,
      projectionRegistry
    );

    const details = await composite.dispatchWithDetails(envelope());

    expect(integrationCalls).toEqual(["notification"]);
    expect(projectionCalls).toEqual(["active"]);
    expect(details.results).toHaveLength(1);
    expect(details.projection.results).toHaveLength(1);
  });

  it("dispatch() returns integration result shape for publisher compatibility", async () => {
    const integrationRegistry = new OrderEventConsumerRegistry(
      new InMemoryConsumerIdempotencyStore(),
      new NoOpEventConsumerMetrics()
    );
    integrationRegistry.register({
      consumer: makeIntegrationConsumer("OrderKitchenConsumer", vi.fn()),
      enabled: true,
      registrationOrder: 10,
      executionPolicy: "parallel",
    });

    const projectionRegistry = new OrderProjectionConsumerRegistry(
      new InMemoryProjectionConsumerIdempotencyStore(),
      new NoOpProjectionConsumerMetrics()
    );

    const composite = new CompositeEventDispatchDelegate(
      integrationRegistry,
      projectionRegistry
    );

    const result = await composite.dispatch(envelope());
    expect(result.eventId).toBe("evt-composite-1");
    expect(result.results).toHaveLength(1);
  });
});
