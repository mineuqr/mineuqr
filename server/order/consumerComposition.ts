import { OrderEventConsumerRegistry } from "./infrastructure/events/registry/OrderEventConsumerRegistry";
import { DrizzleConsumerIdempotencyStore } from "./infrastructure/events/consumers/idempotency/DrizzleConsumerIdempotencyStore";
import { OrderNotificationConsumer } from "./infrastructure/events/consumers/OrderNotificationConsumer";
import { OrderSessionConsumer } from "./infrastructure/events/consumers/OrderSessionConsumer";
import { OrderKitchenConsumer } from "./infrastructure/events/consumers/OrderKitchenConsumer";
import { OrderPrintingConsumer } from "./infrastructure/events/consumers/OrderPrintingConsumer";
import { orderPrintDispatchAdapter } from "../printing/printingComposition";
import {
  NoOpEventConsumerMetrics,
  OpsEventConsumerMetrics,
} from "./infrastructure/events/monitoring/OpsEventConsumerMetrics";

const consumerMetrics =
  process.env.NODE_ENV === "test"
    ? new NoOpEventConsumerMetrics()
    : new OpsEventConsumerMetrics();

export const orderConsumerIdempotencyStore = new DrizzleConsumerIdempotencyStore();

export const orderEventConsumerRegistry = new OrderEventConsumerRegistry(
  orderConsumerIdempotencyStore,
  consumerMetrics
);

const notificationConsumer = new OrderNotificationConsumer();
const sessionConsumer = new OrderSessionConsumer();
const kitchenConsumer = new OrderKitchenConsumer();
const printingConsumer = new OrderPrintingConsumer(orderPrintDispatchAdapter);

orderEventConsumerRegistry.register({
  consumer: notificationConsumer,
  enabled: true,
  registrationOrder: 10,
  executionPolicy: "parallel",
});

orderEventConsumerRegistry.register({
  consumer: sessionConsumer,
  enabled: true,
  registrationOrder: 20,
  executionPolicy: "parallel",
});

orderEventConsumerRegistry.register({
  consumer: kitchenConsumer,
  enabled: true,
  registrationOrder: 30,
  executionPolicy: "parallel",
});

orderEventConsumerRegistry.register({
  consumer: printingConsumer,
  enabled: true,
  registrationOrder: 40,
  executionPolicy: "parallel",
});

export {
  notificationConsumer,
  sessionConsumer,
  kitchenConsumer,
  printingConsumer,
};
