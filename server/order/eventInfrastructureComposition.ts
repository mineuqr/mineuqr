import { DrizzleOutboxRepository } from "./infrastructure/events/outbox/DrizzleOutboxRepository";
import { InProcessEventPublisher } from "./infrastructure/events/publisher/InProcessEventPublisher";
import { OrderEventRelay } from "./infrastructure/events/relay/OrderEventRelay";
import {
  NoOpEventInfrastructureMetrics,
  OpsEventInfrastructureMetrics,
} from "./infrastructure/events/monitoring/EventInfrastructureMetrics";
import { createOrderEventDispatchDelegate } from "./read/readComposition";

const metrics =
  process.env.NODE_ENV === "test"
    ? new NoOpEventInfrastructureMetrics()
    : new OpsEventInfrastructureMetrics();

export const orderEventDispatchDelegate = createOrderEventDispatchDelegate();

export const orderOutboxRepository = new DrizzleOutboxRepository();
export const orderEventPublisher = new InProcessEventPublisher(
  metrics,
  orderEventDispatchDelegate
);
export const orderEventRelay = new OrderEventRelay(
  orderOutboxRepository,
  orderEventPublisher,
  metrics
);

/** Process a batch of pending outbox events (composition / post-mutation invocation). */
export async function runOrderEventRelayBatch(limit = 50) {
  return orderEventRelay.processBatch(limit);
}
