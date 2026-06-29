import type { EventEnvelope } from "../../EventEnvelope";

export type OrderEventConsumerName =
  | "OrderNotificationConsumer"
  | "OrderSessionConsumer"
  | "OrderKitchenConsumer"
  | "OrderPrintingConsumer";

export type ConsumerExecutionPolicy = "parallel" | "sequential";

export interface OrderEventConsumer {
  readonly name: OrderEventConsumerName;
  readonly subscribedEventTypes: readonly string[];
  handle(envelope: EventEnvelope): Promise<void>;
}

export type ConsumerRegistration = {
  consumer: OrderEventConsumer;
  enabled: boolean;
  registrationOrder: number;
  executionPolicy: ConsumerExecutionPolicy;
};

export type ConsumerDispatchResult = {
  consumerName: OrderEventConsumerName;
  success: boolean;
  skipped: boolean;
  latencyMs: number;
  error?: string;
};

export type RegistryDispatchResult = {
  eventId: string;
  eventType: string;
  results: ConsumerDispatchResult[];
};
