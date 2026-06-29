import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import type { OrderEventConsumer } from "./contracts/OrderEventConsumer";
import type { EventEnvelope } from "../EventEnvelope";

/** Kitchen integration foundation — telemetry only; no KDS UI (ORDER-EVENTS-1B). */
export class OrderKitchenConsumer implements OrderEventConsumer {
  readonly name = "OrderKitchenConsumer" as const;
  readonly subscribedEventTypes = ["OrderCreated", "OrderStatusChanged"] as const;

  async handle(envelope: EventEnvelope): Promise<void> {
    opsLog({
      type: OPS_EVENT.order_kitchen_event_received,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      restaurantId: envelope.restaurantId,
      metadata: {
        eventType: envelope.eventType,
        eventId: envelope.eventId,
        orderId: envelope.aggregateId,
      },
    });
  }
}
