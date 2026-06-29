import type { EventEnvelope } from "../EventEnvelope";
import type { EventPublisher } from "../contracts/EventInfrastructureContracts";
import type { EventInfrastructureMetrics } from "../monitoring/EventInfrastructureMetrics";
import type { ConsumerRegistryDispatchDelegate } from "../registry/OrderEventConsumerRegistry";

/**
 * Transport-only publisher — delegates to Registration Layer (ORDER-EVENTS-1B).
 * Must not contain consumer list, ordering, or business logic.
 */
export class InProcessEventPublisher implements EventPublisher {
  constructor(
    private readonly metrics: EventInfrastructureMetrics,
    private readonly dispatchDelegate: ConsumerRegistryDispatchDelegate
  ) {}

  async publish(envelope: EventEnvelope): Promise<void> {
    const started = Date.now();
    try {
      await this.dispatchDelegate.dispatch(envelope);
      this.metrics.recordPublicationSuccess({
        eventType: envelope.eventType,
        restaurantId: envelope.restaurantId,
        latencyMs: Date.now() - started,
      });
    } catch (error) {
      this.metrics.recordPublicationFailure({
        eventType: envelope.eventType,
        restaurantId: envelope.restaurantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
