import type { EventEnvelope } from "../EventEnvelope";
import type { EventPublisher } from "../contracts/EventInfrastructureContracts";
import type { EventInfrastructureMetrics } from "../monitoring/EventInfrastructureMetrics";

/**
 * In-process publisher — ORDER-EVENTS-1A.
 * No transport binding; ORDER-EVENTS-1B registers consumer dispatch hooks.
 */
export class InProcessEventPublisher implements EventPublisher {
  constructor(private readonly metrics: EventInfrastructureMetrics) {}

  async publish(envelope: EventEnvelope): Promise<void> {
    const started = Date.now();
    try {
      // Infrastructure-only: no consumer dispatch in ORDER-EVENTS-1A
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
