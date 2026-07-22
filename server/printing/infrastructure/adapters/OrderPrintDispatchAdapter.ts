import type { OrderPrintDispatchPort, OrderPrintDispatchRequest } from "../../../order/infrastructure/events/consumers/ports/OrderPrintDispatchPort";
import { orderPrintBusinessIdempotencyKey } from "../../../order/infrastructure/events/consumers/idempotency/DurableBusinessClaimStore";
import type { PrintingService } from "../../application/PrintingService";

export class OrderPrintDispatchAdapter implements OrderPrintDispatchPort {
  constructor(private readonly printingService: PrintingService) {}

  async dispatchPrintRequest(request: OrderPrintDispatchRequest): Promise<void> {
    // ADR-ARCH-021 Pattern E — natural uniqueness on business-scoped key.
    const idempotencyKey = orderPrintBusinessIdempotencyKey(
      request.orderId,
      request.eventType
    );
    const payload = await this.printingService.buildPayloadForOrder({
      restaurantId: request.restaurantId,
      orderId: request.orderId,
      source: "order_event",
      eventType: request.eventType,
      eventId: request.eventId,
    });

    if (!payload) return;

    await this.printingService.requestPrint({
      restaurantId: request.restaurantId,
      orderId: request.orderId,
      orderNumber: request.orderNumber ?? payload.orderNumber,
      source: "order_event",
      idempotencyKey,
      triggerEventType: request.eventType,
      triggerEventId: request.eventId,
      payload,
      dispatch: true,
    });
  }
}
