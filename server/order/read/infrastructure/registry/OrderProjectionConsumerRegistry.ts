import type { EventEnvelope } from "../../../infrastructure/events/EventEnvelope";
import type { ProjectionConsumerIdempotencyStore } from "../persistence/idempotency/ProjectionConsumerIdempotencyStore";
import type { ProjectionConsumerMetrics } from "../monitoring/ProjectionConsumerMetrics";
import type {
  OrderProjectionConsumer,
  OrderProjectionConsumerName,
  ProjectionConsumerDispatchResult,
  ProjectionConsumerRegistration,
  ProjectionRegistryDispatchResult,
} from "../../projections/consumers/contracts/OrderProjectionConsumer";

export type ProjectionRegistryDispatchDelegate = {
  dispatchProjections(envelope: EventEnvelope): Promise<ProjectionRegistryDispatchResult>;
};

/**
 * Declarative projection consumer registration (READ-ARCHITECTURE-1 RA-05 / RA-06).
 * Separate from integration consumers — no cross-calls permitted.
 */
export class OrderProjectionConsumerRegistry implements ProjectionRegistryDispatchDelegate {
  private readonly registrations = new Map<
    OrderProjectionConsumerName,
    ProjectionConsumerRegistration
  >();

  constructor(
    private readonly idempotency: ProjectionConsumerIdempotencyStore,
    private readonly metrics: ProjectionConsumerMetrics
  ) {}

  register(registration: ProjectionConsumerRegistration): void {
    this.registrations.set(registration.consumer.name, registration);
  }

  setEnabled(consumerName: OrderProjectionConsumerName, enabled: boolean): void {
    const entry = this.registrations.get(consumerName);
    if (entry) {
      entry.enabled = enabled;
    }
  }

  getRegistrations(): ProjectionConsumerRegistration[] {
    return Array.from(this.registrations.values()).sort(
      (a, b) => a.registrationOrder - b.registrationOrder
    );
  }

  async dispatchProjections(envelope: EventEnvelope): Promise<ProjectionRegistryDispatchResult> {
    const eligible = this.getRegistrations().filter(
      (r) =>
        r.enabled &&
        r.consumer.subscribedEventTypes.includes(envelope.eventType)
    );

    const results: ProjectionConsumerDispatchResult[] = [];

    const runOne = async (registration: ProjectionConsumerRegistration): Promise<void> => {
      const { consumer } = registration;
      const started = Date.now();

      if (await this.idempotency.hasProcessed(consumer.name, envelope.eventId)) {
        results.push({
          consumerName: consumer.name,
          projectionId: consumer.projectionId,
          success: true,
          skipped: true,
          latencyMs: Date.now() - started,
        });
        this.metrics.recordProjectionConsumerSkipped({
          consumerName: consumer.name,
          projectionId: consumer.projectionId,
          eventType: envelope.eventType,
          eventId: envelope.eventId,
        });
        return;
      }

      try {
        await consumer.handle(envelope);
        await this.idempotency.markProcessed(consumer.name, envelope.eventId);
        const latencyMs = Date.now() - started;
        results.push({
          consumerName: consumer.name,
          projectionId: consumer.projectionId,
          success: true,
          skipped: false,
          latencyMs,
        });
        this.metrics.recordProjectionConsumerSuccess({
          consumerName: consumer.name,
          projectionId: consumer.projectionId,
          eventType: envelope.eventType,
          eventId: envelope.eventId,
          latencyMs,
        });
      } catch (error) {
        const latencyMs = Date.now() - started;
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          consumerName: consumer.name,
          projectionId: consumer.projectionId,
          success: false,
          skipped: false,
          latencyMs,
          error: message,
        });
        this.metrics.recordProjectionConsumerFailure({
          consumerName: consumer.name,
          projectionId: consumer.projectionId,
          eventType: envelope.eventType,
          eventId: envelope.eventId,
          error: message,
          latencyMs,
        });
      }
    };

    const parallel = eligible.filter((r) => r.executionPolicy === "parallel");
    const sequential = eligible.filter((r) => r.executionPolicy === "sequential");

    await Promise.all(parallel.map((r) => runOne(r)));
    for (const registration of sequential) {
      await runOne(registration);
    }

    return {
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      results,
    };
  }
}
