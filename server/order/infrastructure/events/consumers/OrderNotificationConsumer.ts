import {
  createNotification,
  getOrderById,
  getOrderItemsByOrderId,
  getRestaurantById,
} from "../../../../db";
import { cleanupPushSubscriptionsForOrder } from "../../../../customerPush/routes";
import { sendReadyPushForOrder } from "../../../../customerPush/sendReadyPush";
import type { EventEnvelope } from "../EventEnvelope";
import { parseEnvelopePayload } from "../serialization/domainEventSerializer";
import type {
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderCreatedEvent,
  OrderReadyEvent,
} from "../../../domain/events/OrderDomainEvents";
import type { OrderEventConsumer } from "./contracts/OrderEventConsumer";

export class OrderNotificationConsumer implements OrderEventConsumer {
  readonly name = "OrderNotificationConsumer" as const;
  readonly subscribedEventTypes = [
    "OrderCreated",
    "OrderReady",
    "OrderCompleted",
    "OrderCancelled",
  ] as const;

  async handle(envelope: EventEnvelope): Promise<void> {
    switch (envelope.eventType) {
      case "OrderCreated":
        await this.handleOrderCreated(
          parseEnvelopePayload<OrderCreatedEvent>(envelope)
        );
        break;
      case "OrderReady":
        await this.handleOrderReady(parseEnvelopePayload<OrderReadyEvent>(envelope));
        break;
      case "OrderCompleted":
        await this.handleOrderCompleted(
          parseEnvelopePayload<OrderCompletedEvent>(envelope)
        );
        break;
      case "OrderCancelled":
        await this.handleOrderCancelled(
          parseEnvelopePayload<OrderCancelledEvent>(envelope)
        );
        break;
      default:
        return;
    }
  }

  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const restaurant = await getRestaurantById(event.restaurantId);
    if (!restaurant) return;

    const items = await getOrderItemsByOrderId(event.orderId);
    const itemsSummary = items
      .map((line) => `${line.nameAr} x${line.quantity}`)
      .join("، ");

    await createNotification({
      userId: restaurant.userId,
      notificationType: "new_order",
      message: `طلب جديد #${event.orderNumber} - طاولة ${event.tableNumber} - ${itemsSummary} - المجموع: ${event.totalAmount} ${restaurant.currencySymbol || "ر.س"}`,
      isRead: false,
      isSent: true,
      sentAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
  }

  private async handleOrderReady(event: OrderReadyEvent): Promise<void> {
    const order = await getOrderById(event.orderId);
    if (!order) return;

    await sendReadyPushForOrder({
      orderId: event.orderId,
      trackingToken: event.trackingToken ?? order.trackingToken,
      orderNumber: order.orderNumber,
    });
  }

  private async handleOrderCompleted(event: OrderCompletedEvent): Promise<void> {
    await cleanupPushSubscriptionsForOrder(event.orderId);
  }

  private async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    await cleanupPushSubscriptionsForOrder(event.orderId);
  }
}
