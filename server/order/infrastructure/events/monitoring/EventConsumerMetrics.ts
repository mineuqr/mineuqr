import type { OrderEventConsumerName } from "../consumers/contracts/OrderEventConsumer";

export type ConsumerSuccessMetric = {
  consumerName: OrderEventConsumerName;
  eventType: string;
  eventId: string;
  latencyMs: number;
};

export type ConsumerFailureMetric = {
  consumerName: OrderEventConsumerName;
  eventType: string;
  eventId: string;
  error: string;
  latencyMs: number;
};

export type ConsumerSkippedMetric = {
  consumerName: OrderEventConsumerName;
  eventType: string;
  eventId: string;
};

export type ConsumerRetryMetric = {
  consumerName: OrderEventConsumerName;
  eventType: string;
  eventId: string;
  attempt: number;
};

export interface EventConsumerMetrics {
  recordConsumerSuccess(metric: ConsumerSuccessMetric): void;
  recordConsumerFailure(metric: ConsumerFailureMetric): void;
  recordConsumerSkipped(metric: ConsumerSkippedMetric): void;
  recordConsumerRetry(metric: ConsumerRetryMetric): void;
}
