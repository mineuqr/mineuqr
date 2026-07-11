import type { OrderActor } from "../value-objects/OrderActor";
import type { OrderLifecycleStage } from "../value-objects/OrderLifecycleStage";

export const ORDER_DOMAIN_EVENT_SCHEMA_VERSION = 1;

export type OrderCreatedEvent = {
  readonly type: "OrderCreated";
  readonly schemaVersion: typeof ORDER_DOMAIN_EVENT_SCHEMA_VERSION;
  readonly orderId: number;
  readonly restaurantId: number;
  readonly tableId: number;
  readonly tableNumber: number;
  readonly orderNumber: string;
  readonly trackingToken: string;
  readonly totalAmount: string;
  readonly lineCount: number;
  readonly sessionId: number | null;
  readonly createdAt: string;
};

export type OrderStatusChangedEvent = {
  readonly type: "OrderStatusChanged";
  readonly schemaVersion: typeof ORDER_DOMAIN_EVENT_SCHEMA_VERSION;
  readonly orderId: number;
  readonly restaurantId: number;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly changedAt: string;
  readonly actor?: OrderActor;
};

export type OrderReadyEvent = {
  readonly type: "OrderReady";
  readonly schemaVersion: typeof ORDER_DOMAIN_EVENT_SCHEMA_VERSION;
  readonly orderId: number;
  readonly trackingToken: string | null;
  readonly readyAt: string;
};

export type OrderCompletedEvent = {
  readonly type: "OrderCompleted";
  readonly schemaVersion: typeof ORDER_DOMAIN_EVENT_SCHEMA_VERSION;
  readonly orderId: number;
  readonly servedAt: string;
};

export type OrderCancelledEvent = {
  readonly type: "OrderCancelled";
  readonly schemaVersion: typeof ORDER_DOMAIN_EVENT_SCHEMA_VERSION;
  readonly orderId: number;
  readonly cancelledAt: string;
  readonly actor?: OrderActor;
};

export type OrderLifecycleStageChangedEvent = {
  readonly type: "OrderLifecycleStageChanged";
  readonly schemaVersion: typeof ORDER_DOMAIN_EVENT_SCHEMA_VERSION;
  readonly orderId: number;
  readonly restaurantId: number;
  readonly fromStage: OrderLifecycleStage;
  readonly toStage: OrderLifecycleStage;
  readonly changedAt: string;
};

export type OrderDomainEvent =
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | OrderReadyEvent
  | OrderCompletedEvent
  | OrderCancelledEvent
  | OrderLifecycleStageChangedEvent;
