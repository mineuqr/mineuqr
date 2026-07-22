import { ENV } from "../../../../_core/env";
import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import { getOrderById } from "../../../../db";
import {
  decrementSessionAggregatesForCancelledOrder,
  incrementSessionAggregatesForOrder,
} from "../../../../diningSession/sessionAggregateWriters";
import { recordSessionEvent } from "../../../../diningSession/sessionService";
import { TABLE_EVENT_TYPES } from "../../../../diningSession/sessionTypes";
import type {
  OrderCancelledEvent,
  OrderCreatedEvent,
} from "../../../domain/events/OrderDomainEvents";
import type { EventEnvelope } from "../EventEnvelope";
import { parseEnvelopePayload } from "../serialization/domainEventSerializer";
import type { OrderEventConsumer } from "./contracts/OrderEventConsumer";
import type { DurableBusinessClaimStore } from "./idempotency/DurableBusinessClaimStore";
import {
  BUSINESS_CLAIM_NS,
  InMemoryDurableBusinessClaimStore,
  sessionOrderCancelledKey,
  sessionOrderCreatedKey,
} from "./idempotency/DurableBusinessClaimStore";

export class OrderSessionConsumer implements OrderEventConsumer {
  readonly name = "OrderSessionConsumer" as const;
  readonly subscribedEventTypes = ["OrderCreated", "OrderCancelled"] as const;

  constructor(
    private readonly businessClaims: DurableBusinessClaimStore = new InMemoryDurableBusinessClaimStore()
  ) {}

  async handle(envelope: EventEnvelope): Promise<void> {
    if (!ENV.tableSessionDualWrite) return;

    switch (envelope.eventType) {
      case "OrderCreated":
        await this.handleOrderCreated(
          parseEnvelopePayload<OrderCreatedEvent>(envelope)
        );
        break;
      case "OrderCancelled":
        await this.handleOrderCancelled(
          parseEnvelopePayload<OrderCancelledEvent>(envelope),
          envelope.restaurantId
        );
        break;
      default:
        return;
    }
  }

  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    if (event.sessionId == null) return;

    // ADR-ARCH-021 Pattern B — once-per-order session create effects.
    const claimed = await this.businessClaims.tryClaim(
      BUSINESS_CLAIM_NS.sessionOrderCreated,
      sessionOrderCreatedKey(event.restaurantId, event.orderId)
    );
    if (!claimed) return;

    try {
      await recordSessionEvent({
        restaurantId: event.restaurantId,
        tableId: event.tableId,
        sessionId: event.sessionId,
        orderId: event.orderId,
        eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
        metadata: {
          orderNumber: event.orderNumber,
          totalAmount: event.totalAmount,
          itemCount: event.lineCount,
        },
      });
    } catch (e) {
      opsLog({
        type: OPS_EVENT.order_created_event_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: event.restaurantId,
        procedure: "OrderSessionConsumer",
        metadata: {
          sessionId: event.sessionId,
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          error: e instanceof Error ? e.message : String(e),
        },
      });
    }

    try {
      await incrementSessionAggregatesForOrder(
        {
          restaurantId: event.restaurantId,
          sessionId: event.sessionId,
          orderTotalAmount: event.totalAmount,
          orderId: event.orderId,
        },
        { procedure: "OrderSessionConsumer" }
      );
    } catch (e) {
      opsLog({
        type: OPS_EVENT.session_aggregate_update_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: event.restaurantId,
        procedure: "OrderSessionConsumer",
        metadata: {
          sessionId: event.sessionId,
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          error: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }

  private async handleOrderCancelled(
    event: OrderCancelledEvent,
    restaurantId: number
  ): Promise<void> {
    const order = await getOrderById(event.orderId);
    if (!order?.sessionId) return;

    const claimed = await this.businessClaims.tryClaim(
      BUSINESS_CLAIM_NS.sessionOrderCancelled,
      sessionOrderCancelledKey(restaurantId, event.orderId)
    );
    if (!claimed) return;

    try {
      await decrementSessionAggregatesForCancelledOrder(
        {
          restaurantId: order.restaurantId,
          sessionId: order.sessionId,
          orderTotalAmount: String(order.totalAmount),
        },
        { procedure: "OrderSessionConsumer" }
      );
    } catch (e) {
      opsLog({
        type: OPS_EVENT.session_aggregate_update_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: order.restaurantId,
        procedure: "OrderSessionConsumer",
        metadata: {
          sessionId: order.sessionId,
          orderId: order.id,
          operation: "cancel",
          error: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }
}
