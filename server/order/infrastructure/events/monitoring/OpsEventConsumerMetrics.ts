import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import type {
  ConsumerFailureMetric,
  ConsumerRetryMetric,
  ConsumerSkippedMetric,
  ConsumerSuccessMetric,
  EventConsumerMetrics,
} from "./EventConsumerMetrics";

export class OpsEventConsumerMetrics implements EventConsumerMetrics {
  recordConsumerSuccess(metric: ConsumerSuccessMetric): void {
    opsLog({
      type: OPS_EVENT.order_consumer_executed,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      metadata: {
        consumerName: metric.consumerName,
        eventType: metric.eventType,
        eventId: metric.eventId,
        latencyMs: metric.latencyMs,
        outcome: "success",
      },
    });
  }

  recordConsumerFailure(metric: ConsumerFailureMetric): void {
    opsLog({
      type: OPS_EVENT.order_consumer_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      metadata: {
        consumerName: metric.consumerName,
        eventType: metric.eventType,
        eventId: metric.eventId,
        latencyMs: metric.latencyMs,
        error: metric.error,
        outcome: "failure",
      },
    });
  }

  recordConsumerSkipped(metric: ConsumerSkippedMetric): void {
    opsLog({
      type: OPS_EVENT.order_consumer_skipped,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      metadata: {
        consumerName: metric.consumerName,
        eventType: metric.eventType,
        eventId: metric.eventId,
        outcome: "skipped_idempotent",
      },
    });
  }

  recordConsumerRetry(metric: ConsumerRetryMetric): void {
    opsLog({
      type: OPS_EVENT.order_consumer_retry,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      metadata: {
        consumerName: metric.consumerName,
        eventType: metric.eventType,
        eventId: metric.eventId,
        attempt: metric.attempt,
      },
    });
  }
}

export class NoOpEventConsumerMetrics implements EventConsumerMetrics {
  recordConsumerSuccess(): void {}
  recordConsumerFailure(): void {}
  recordConsumerSkipped(): void {}
  recordConsumerRetry(): void {}
}
