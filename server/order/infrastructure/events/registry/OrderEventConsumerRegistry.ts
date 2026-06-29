import type { EventEnvelope } from "../EventEnvelope";
import type {
  ConsumerDispatchResult,
  ConsumerRegistration,
  OrderEventConsumer,
  OrderEventConsumerName,
  RegistryDispatchResult,
} from "../consumers/contracts/OrderEventConsumer";
import type { ConsumerIdempotencyStore } from "../consumers/idempotency/ConsumerIdempotencyStore";
import type { EventConsumerMetrics } from "../monitoring/EventConsumerMetrics";

export type ConsumerRegistryDispatchDelegate = {
  dispatch(envelope: EventEnvelope): Promise<RegistryDispatchResult>;
};

/**
 * Declarative consumer registration and dispatch (ORDER-EVENTS-1B).
 * Owns execution policy and failure isolation — not business or transport logic.
 */
export class OrderEventConsumerRegistry implements ConsumerRegistryDispatchDelegate {
  private readonly registrations = new Map<OrderEventConsumerName, ConsumerRegistration>();

  constructor(
    private readonly idempotency: ConsumerIdempotencyStore,
    private readonly metrics: EventConsumerMetrics
  ) {}

  register(registration: ConsumerRegistration): void {
    this.registrations.set(registration.consumer.name, registration);
  }

  setEnabled(consumerName: OrderEventConsumerName, enabled: boolean): void {
    const entry = this.registrations.get(consumerName);
    if (entry) {
      entry.enabled = enabled;
    }
  }

  getRegistrations(): ConsumerRegistration[] {
    return Array.from(this.registrations.values()).sort(
      (a, b) => a.registrationOrder - b.registrationOrder
    );
  }

  async dispatch(envelope: EventEnvelope): Promise<RegistryDispatchResult> {
    const eligible = this.getRegistrations().filter(
      (r) =>
        r.enabled &&
        r.consumer.subscribedEventTypes.includes(envelope.eventType)
    );

    const results: ConsumerDispatchResult[] = [];

    const runOne = async (registration: ConsumerRegistration): Promise<void> => {
      const { consumer } = registration;
      const started = Date.now();

      if (await this.idempotency.hasProcessed(consumer.name, envelope.eventId)) {
        results.push({
          consumerName: consumer.name,
          success: true,
          skipped: true,
          latencyMs: Date.now() - started,
        });
        this.metrics.recordConsumerSkipped({
          consumerName: consumer.name,
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
          success: true,
          skipped: false,
          latencyMs,
        });
        this.metrics.recordConsumerSuccess({
          consumerName: consumer.name,
          eventType: envelope.eventType,
          eventId: envelope.eventId,
          latencyMs,
        });
      } catch (error) {
        const latencyMs = Date.now() - started;
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          consumerName: consumer.name,
          success: false,
          skipped: false,
          latencyMs,
          error: message,
        });
        this.metrics.recordConsumerFailure({
          consumerName: consumer.name,
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
