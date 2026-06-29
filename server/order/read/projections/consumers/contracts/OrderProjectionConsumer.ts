import type { EventEnvelope } from "../../../../infrastructure/events/EventEnvelope";
import type { ProjectionId } from "../../../domain/contracts/projectionIds";

export type OrderProjectionConsumerName =
  | "OwnerOrdersProjectionConsumer"
  | "ActiveOrdersProjectionConsumer"
  | "OrderDetailsProjectionConsumer"
  | "OrderTimelineProjectionConsumer"
  | "OperationalKpiProjectionConsumer"
  | "OrderAnalyticsProjectionConsumer"
  | "PublicOrderStatusProjectionConsumer"
  | "DashboardOverviewProjectionConsumer"
  | "KitchenQueueProjectionConsumer"
  | "PrintingQueueProjectionConsumer";

export type ProjectionConsumerExecutionPolicy = "parallel" | "sequential";

export interface OrderProjectionConsumer {
  readonly name: OrderProjectionConsumerName;
  readonly projectionId: ProjectionId;
  readonly subscribedEventTypes: readonly string[];
  handle(envelope: EventEnvelope): Promise<void>;
}

export type ProjectionConsumerRegistration = {
  consumer: OrderProjectionConsumer;
  enabled: boolean;
  registrationOrder: number;
  executionPolicy: ProjectionConsumerExecutionPolicy;
};

export type ProjectionConsumerDispatchResult = {
  consumerName: OrderProjectionConsumerName;
  projectionId: ProjectionId;
  success: boolean;
  skipped: boolean;
  latencyMs: number;
  error?: string;
};

export type ProjectionRegistryDispatchResult = {
  eventId: string;
  eventType: string;
  results: ProjectionConsumerDispatchResult[];
};
