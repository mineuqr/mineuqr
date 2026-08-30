import type {
  EventPublisher,
  EventRelay,
  RelayBatchResult,
} from "../contracts/EventInfrastructureContracts";
import type { OutboxRepository } from "../contracts/EventInfrastructureContracts";
import type { EventInfrastructureMetrics } from "../monitoring/EventInfrastructureMetrics";
import { computeRetryDelayMs } from "../outbox/outboxRetrySchedule";

const MAX_PUBLISH_ATTEMPTS = 5;

export class OrderEventRelay implements EventRelay {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly publisher: EventPublisher,
    private readonly metrics: EventInfrastructureMetrics
  ) {}

  async processBatch(limit: number): Promise<RelayBatchResult> {
    const started = Date.now();
    const pending = await this.outbox.fetchPendingBatch(limit);
    const pendingCount = await this.outbox.countPending();
    this.metrics.recordQueueDepth({ pendingCount });

    let published = 0;
    let failed = 0;
    let skipped = 0;

    for (const record of pending) {
      const envelope = {
        id: record.id,
        eventId: record.eventId,
        eventType: record.eventType,
        aggregateType: record.aggregateType,
        aggregateId: record.aggregateId,
        aggregateVersion: record.aggregateVersion,
        restaurantId: record.restaurantId,
        sequenceNumber: record.sequenceNumber,
        occurredAt: record.occurredAt,
        correlationId: record.correlationId,
        causationId: record.causationId,
        payloadVersion: record.payloadVersion,
        payload: record.payload,
      };

      try {
        await this.publisher.publish(envelope);
        const publishedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
        const marked = await this.outbox.markPublished(record.id, publishedAt);
        if (marked) {
          published += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        const attempt = record.publishAttempts + 1;
        const message = error instanceof Error ? error.message : String(error);
        const deadLetter = attempt >= MAX_PUBLISH_ATTEMPTS;
        const nextRetryAt = deadLetter
          ? null
          : new Date(Date.now() + computeRetryDelayMs(attempt))
              .toISOString()
              .slice(0, 19)
              .replace("T", " ");

        await this.outbox.markPublishFailed(
          record.id,
          message,
          nextRetryAt,
          deadLetter
        );

        this.metrics.recordRetry({
          eventType: record.eventType,
          outboxId: record.id,
          attempt,
          nextRetryAt,
        });

        failed += 1;
      }
    }

    const result: RelayBatchResult = {
      processed: pending.length,
      published,
      failed,
      skipped,
    };

    this.metrics.recordRelayBatch({
      ...result,
      durationMs: Date.now() - started,
    });

    return result;
  }
}

export { computeRetryDelayMs } from "../outbox/outboxRetrySchedule";
