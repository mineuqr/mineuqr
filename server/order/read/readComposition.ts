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
 * Phase 2: materializing consumers registered on the projection registry.
 * NOT activated — publisher remains integration-only unless ORDER_READ_PROJECTIONS_ENABLED=true.
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
 * Returns composite dispatch when ORDER_READ_PROJECTIONS_ENABLED=true.
 * Default false — production publisher unchanged (ORDER-EVENTS-1B certified path).
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
