/**
 * ADR-ARCH-022 / ORDER-SETTLEMENT-DOMAIN-1 — domain event contracts only.
 * No bus, publishing, outbox, or persistence.
 *
 * Compatible with ADR-ARCH-021: events are pure facts describing a command
 * outcome; integration programs may claim/publish them later.
 */

import type {
  OrderSettlement,
  OrderSettlementStatus,
} from "./orderSettlementContract";

export const ORDER_SETTLEMENT_DOMAIN_EVENT_TYPES = [
  "OrderSettlementCreated",
  "OrderSettlementRecalculated",
  "OrderSettlementPartiallySettled",
  "OrderSettlementSettled",
  "OrderSettlementComplimentary",
  "OrderSettlementCancelled",
  "OrderSettlementVoided",
  "OrderSettlementRefunded",
] as const;

export type OrderSettlementDomainEventType =
  (typeof ORDER_SETTLEMENT_DOMAIN_EVENT_TYPES)[number];

type OrderSettlementEventBase = Readonly<{
  eventType: OrderSettlementDomainEventType;
  restaurantId: number;
  checkId: number;
  orderId: number;
  occurredAt: string;
  status: OrderSettlementStatus;
}>;

export type OrderSettlementCreated = OrderSettlementEventBase &
  Readonly<{
    eventType: "OrderSettlementCreated";
    orderTotalSnapshot: string;
  }>;

export type OrderSettlementRecalculated = OrderSettlementEventBase &
  Readonly<{
    eventType: "OrderSettlementRecalculated";
    orderTotalSnapshot: string;
    settledAmount: string;
    outstandingAmount: string;
  }>;

export type OrderSettlementPartiallySettled = OrderSettlementEventBase &
  Readonly<{
    eventType: "OrderSettlementPartiallySettled";
    settledAmount: string;
    outstandingAmount: string;
    coverageApplied: string;
  }>;

export type OrderSettlementSettled = OrderSettlementEventBase &
  Readonly<{
    eventType: "OrderSettlementSettled";
    settledAmount: string;
  }>;

export type OrderSettlementComplimentary = OrderSettlementEventBase &
  Readonly<{
    eventType: "OrderSettlementComplimentary";
    settledAmount: string;
  }>;

export type OrderSettlementCancelled = OrderSettlementEventBase &
  Readonly<{
    eventType: "OrderSettlementCancelled";
  }>;

export type OrderSettlementVoided = OrderSettlementEventBase &
  Readonly<{
    eventType: "OrderSettlementVoided";
  }>;

export type OrderSettlementRefunded = OrderSettlementEventBase &
  Readonly<{
    eventType: "OrderSettlementRefunded";
    refundedAmount: string;
  }>;

export type OrderSettlementDomainEvent =
  | OrderSettlementCreated
  | OrderSettlementRecalculated
  | OrderSettlementPartiallySettled
  | OrderSettlementSettled
  | OrderSettlementComplimentary
  | OrderSettlementCancelled
  | OrderSettlementVoided
  | OrderSettlementRefunded;

export function eventBaseFromSettlement(
  settlement: OrderSettlement,
  eventType: OrderSettlementDomainEventType,
  occurredAt: string
): OrderSettlementEventBase {
  return {
    eventType,
    restaurantId: settlement.restaurantId,
    checkId: settlement.checkId,
    orderId: settlement.orderId,
    occurredAt,
    status: settlement.status,
  };
}
