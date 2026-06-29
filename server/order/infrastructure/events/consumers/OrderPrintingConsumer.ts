import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import { getOrderById } from "../../../../db";
import type { OrderCreatedEvent, OrderReadyEvent } from "../../../domain/events/OrderDomainEvents";
import type { EventEnvelope } from "../EventEnvelope";
import { parseEnvelopePayload } from "../serialization/domainEventSerializer";
import type { OrderEventConsumer } from "./contracts/OrderEventConsumer";
import type { OrderPrintDispatchPort } from "./ports/OrderPrintDispatchPort";

export class OrderPrintingConsumer implements OrderEventConsumer {
  readonly name = "OrderPrintingConsumer" as const;
  readonly subscribedEventTypes = ["OrderCreated", "OrderReady"] as const;

  constructor(private readonly printDispatch: OrderPrintDispatchPort) {}

  async handle(envelope: EventEnvelope): Promise<void> {
    switch (envelope.eventType) {
      case "OrderCreated": {
        const event = parseEnvelopePayload<OrderCreatedEvent>(envelope);
        await this.dispatch(event.orderId, envelope, event.orderNumber);
        break;
      }
      case "OrderReady": {
        const event = parseEnvelopePayload<OrderReadyEvent>(envelope);
        const order = await getOrderById(event.orderId);
        await this.dispatch(event.orderId, envelope, order?.orderNumber ?? null);
        break;
      }
      default:
        return;
    }
  }

  private async dispatch(
    orderId: number,
    envelope: EventEnvelope,
    orderNumber: string | null
  ): Promise<void> {
    await this.printDispatch.dispatchPrintRequest({
      orderId,
      restaurantId: envelope.restaurantId,
      eventType: envelope.eventType,
      eventId: envelope.eventId,
      orderNumber,
    });

    opsLog({
      type: OPS_EVENT.order_print_dispatch_requested,
      category: "ORDER",
      severity: "debug",
      ts: new Date().toISOString(),
      restaurantId: envelope.restaurantId,
      metadata: {
        orderId,
        eventType: envelope.eventType,
        eventId: envelope.eventId,
        orderNumber,
      },
    });
  }
}
