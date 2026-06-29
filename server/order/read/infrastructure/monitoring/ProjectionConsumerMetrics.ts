import type { OrderProjectionConsumerName } from "../../projections/consumers/contracts/OrderProjectionConsumer";

export type ProjectionConsumerSuccessMetric = {
  consumerName: OrderProjectionConsumerName;
  projectionId: string;
  eventType: string;
  eventId: string;
  latencyMs: number;
};

export type ProjectionConsumerFailureMetric = {
  consumerName: OrderProjectionConsumerName;
  projectionId: string;
  eventType: string;
  eventId: string;
  error: string;
  latencyMs: number;
};

export type ProjectionConsumerSkippedMetric = {
  consumerName: OrderProjectionConsumerName;
  projectionId: string;
  eventType: string;
  eventId: string;
};

export interface ProjectionConsumerMetrics {
  recordProjectionConsumerSuccess(metric: ProjectionConsumerSuccessMetric): void;
  recordProjectionConsumerFailure(metric: ProjectionConsumerFailureMetric): void;
  recordProjectionConsumerSkipped(metric: ProjectionConsumerSkippedMetric): void;
}
