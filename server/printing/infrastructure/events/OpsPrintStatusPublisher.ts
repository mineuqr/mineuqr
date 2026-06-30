import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import type { PrintStatusPublisher } from "../../contracts/ports/PrintStatusPublisher";
import type { PrintOperationalEvent } from "../../domain/PrintOperationalEvent";

const OPS_EVENT_BY_PRINT_EVENT: Record<PrintOperationalEvent["eventType"], string> = {
  PrintRequested: OPS_EVENT.print_requested,
  PrintDispatched: OPS_EVENT.print_dispatched,
  PrintStarted: OPS_EVENT.print_started,
  PrintCompleted: OPS_EVENT.print_completed,
  PrintFailed: OPS_EVENT.print_failed,
  PrintCancelled: OPS_EVENT.print_cancelled,
};

export class OpsPrintStatusPublisher implements PrintStatusPublisher {
  async publish(event: PrintOperationalEvent): Promise<void> {
    opsLog({
      type: OPS_EVENT_BY_PRINT_EVENT[event.eventType],
      category: "ORDER",
      severity: event.eventType === "PrintFailed" ? "warn" : "info",
      ts: event.occurredAt,
      restaurantId: event.restaurantId,
      metadata: {
        printJobId: event.printJobId,
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        fromStatus: event.fromStatus ?? null,
        toStatus: event.toStatus,
        ...event.metadata,
      },
    });
  }
}
