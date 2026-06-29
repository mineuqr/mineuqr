import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";

/**
 * Infrastructure-level telemetry for event outbox (ORDER-EVENTS-1A).
 * No business KPIs — publication/retry/queue depth only.
 */
export interface EventInfrastructureMetrics {
  recordPublicationSuccess(metric: PublicationSuccessMetric): void;
  recordPublicationFailure(metric: PublicationFailureMetric): void;
  recordRetry(metric: RetryMetric): void;
  recordQueueDepth(metric: QueueDepthMetric): void;
  recordRelayBatch(metric: RelayBatchMetric): void;
}

export type PublicationSuccessMetric = {
  eventType: string;
  restaurantId: number;
  latencyMs: number;
};

export type PublicationFailureMetric = {
  eventType: string;
  restaurantId: number;
  error: string;
};

export type RetryMetric = {
  eventType: string;
  outboxId: string;
  attempt: number;
  nextRetryAt: string | null;
};

export type QueueDepthMetric = {
  pendingCount: number;
};

export type RelayBatchMetric = {
  processed: number;
  published: number;
  failed: number;
  durationMs: number;
};

export class OpsEventInfrastructureMetrics implements EventInfrastructureMetrics {
  recordPublicationSuccess(metric: PublicationSuccessMetric): void {
    opsLog({
      type: OPS_EVENT.order_outbox_published,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      restaurantId: metric.restaurantId,
      metadata: {
        eventType: metric.eventType,
        latencyMs: metric.latencyMs,
      },
    });
  }

  recordPublicationFailure(metric: PublicationFailureMetric): void {
    opsLog({
      type: OPS_EVENT.order_outbox_publish_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: metric.restaurantId,
      metadata: {
        eventType: metric.eventType,
        error: metric.error,
      },
    });
  }

  recordRetry(metric: RetryMetric): void {
    opsLog({
      type: OPS_EVENT.order_outbox_publish_retry,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      metadata: {
        eventType: metric.eventType,
        outboxId: metric.outboxId,
        attempt: metric.attempt,
        nextRetryAt: metric.nextRetryAt,
      },
    });
  }

  recordQueueDepth(metric: QueueDepthMetric): void {
    opsLog({
      type: OPS_EVENT.order_outbox_queue_depth,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      metadata: { pendingCount: metric.pendingCount },
    });
  }

  recordRelayBatch(metric: RelayBatchMetric): void {
    opsLog({
      type: OPS_EVENT.order_outbox_relay_batch,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      metadata: {
        processed: metric.processed,
        published: metric.published,
        failed: metric.failed,
        durationMs: metric.durationMs,
      },
    });
  }
}

/** No-op metrics for unit tests */
export class NoOpEventInfrastructureMetrics implements EventInfrastructureMetrics {
  recordPublicationSuccess(): void {}
  recordPublicationFailure(): void {}
  recordRetry(): void {}
  recordQueueDepth(): void {}
  recordRelayBatch(): void {}
}
