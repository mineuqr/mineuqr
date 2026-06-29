import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import type {
  ProjectionConsumerFailureMetric,
  ProjectionConsumerMetrics,
  ProjectionConsumerSkippedMetric,
  ProjectionConsumerSuccessMetric,
} from "./ProjectionConsumerMetrics";

export class OpsProjectionConsumerMetrics implements ProjectionConsumerMetrics {
  recordProjectionConsumerSuccess(metric: ProjectionConsumerSuccessMetric): void {
    opsLog({
      type: OPS_EVENT.order_projection_consumer_executed,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      restaurantId: undefined,
      metadata: {
        consumerName: metric.consumerName,
        projectionId: metric.projectionId,
        eventType: metric.eventType,
        eventId: metric.eventId,
        latencyMs: metric.latencyMs,
        outcome: "success",
      },
    });
  }

  recordProjectionConsumerFailure(metric: ProjectionConsumerFailureMetric): void {
    opsLog({
      type: OPS_EVENT.order_projection_consumer_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      metadata: {
        consumerName: metric.consumerName,
        projectionId: metric.projectionId,
        eventType: metric.eventType,
        eventId: metric.eventId,
        latencyMs: metric.latencyMs,
        error: metric.error,
        outcome: "failure",
      },
    });
  }

  recordProjectionConsumerSkipped(metric: ProjectionConsumerSkippedMetric): void {
    opsLog({
      type: OPS_EVENT.order_projection_consumer_skipped,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      metadata: {
        consumerName: metric.consumerName,
        projectionId: metric.projectionId,
        eventType: metric.eventType,
        eventId: metric.eventId,
        outcome: "skipped_idempotent",
      },
    });
  }
}

export class NoOpProjectionConsumerMetrics implements ProjectionConsumerMetrics {
  recordProjectionConsumerSuccess(): void {}
  recordProjectionConsumerFailure(): void {}
  recordProjectionConsumerSkipped(): void {}
}
