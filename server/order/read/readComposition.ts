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
 * Phase 1: no projection consumers registered — registry is empty.
 * Materializing consumers register here in ORDERS-READ-MODEL-1 Phase 2+.
 */
export function registerOrderProjectionConsumers(): void {
  const candidates = orderProjectionLifecycleRegistry.listMaterializingCandidates();
  void candidates;
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
