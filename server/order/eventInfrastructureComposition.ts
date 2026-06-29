import { DrizzleOutboxRepository } from "./infrastructure/events/outbox/DrizzleOutboxRepository";
import { InProcessEventPublisher } from "./infrastructure/events/publisher/InProcessEventPublisher";
import { OrderEventRelay } from "./infrastructure/events/relay/OrderEventRelay";
import {
  NoOpEventInfrastructureMetrics,
  OpsEventInfrastructureMetrics,
} from "./infrastructure/events/monitoring/EventInfrastructureMetrics";

const metrics =
  process.env.NODE_ENV === "test"
    ? new NoOpEventInfrastructureMetrics()
    : new OpsEventInfrastructureMetrics();

export const orderOutboxRepository = new DrizzleOutboxRepository();
export const orderEventPublisher = new InProcessEventPublisher(metrics);
export const orderEventRelay = new OrderEventRelay(
  orderOutboxRepository,
  orderEventPublisher,
  metrics
);

/** Process a batch of pending outbox events (scheduled / ops invocation). */
export async function runOrderEventRelayBatch(limit = 50) {
  return orderEventRelay.processBatch(limit);
}
