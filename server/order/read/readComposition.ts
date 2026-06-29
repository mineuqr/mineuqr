import { ENV } from "../../_core/env";
import { orderEventConsumerRegistry } from "../consumerComposition";
import { DrizzleProjectionConsumerIdempotencyStore } from "./infrastructure/persistence/idempotency/DrizzleProjectionConsumerIdempotencyStore";
import { OrderProjectionConsumerRegistry } from "./infrastructure/registry/OrderProjectionConsumerRegistry";
import { CompositeEventDispatchDelegate } from "./infrastructure/registry/CompositeEventDispatchDelegate";
import {
  NoOpProjectionConsumerMetrics,
  OpsProjectionConsumerMetrics,
} from "./infrastructure/monitoring/OpsProjectionConsumerMetrics";
import type { ConsumerRegistryDispatchDelegate } from "../infrastructure/events/registry/OrderEventConsumerRegistry";
import { orderProjectionLifecycleRegistry } from "./projections/lifecycle/ProjectionLifecycleRegistry";
import { createOrderReadProjectionConsumers } from "./projections/consumers/createOrderReadProjectionConsumers";
import { orderReadProjectionMaterializer } from "./readPersistenceComposition";

const projectionMetrics =
  process.env.NODE_ENV === "test"
    ? new NoOpProjectionConsumerMetrics()
    : new OpsProjectionConsumerMetrics();

export const orderProjectionConsumerIdempotencyStore =
  new DrizzleProjectionConsumerIdempotencyStore();

export const orderProjectionConsumerRegistry = new OrderProjectionConsumerRegistry(
  orderProjectionConsumerIdempotencyStore,
  projectionMetrics
);

/**
 * Phase 3B: materializing consumers registered on the projection registry.
 * Active when ENV.orderReadProjectionsEnabled is true (default on outside test).
 */
export function registerOrderProjectionConsumers(): void {
  const consumers = createOrderReadProjectionConsumers(orderReadProjectionMaterializer);
  let order = 10;
  for (const consumer of consumers) {
    orderProjectionConsumerRegistry.register({
      consumer,
      enabled: true,
      registrationOrder: order,
      executionPolicy: "parallel",
    });
    order += 10;
  }
}

registerOrderProjectionConsumers();

/**
 * Returns composite dispatch when projections are enabled (Phase 3B default on).
 * Integration-only when ORDER_READ_PROJECTIONS_ENABLED=false or NODE_ENV=test.
 */
export function createOrderEventDispatchDelegate(): ConsumerRegistryDispatchDelegate {
  if (!ENV.orderReadProjectionsEnabled) {
    return orderEventConsumerRegistry;
  }
  return new CompositeEventDispatchDelegate(
    orderEventConsumerRegistry,
    orderProjectionConsumerRegistry
  );
}

export {
  orderProjectionLifecycleRegistry,
  CompositeEventDispatchDelegate,
  OrderProjectionConsumerRegistry,
};
