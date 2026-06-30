import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import type { PrintConnectorPort, PrintConnectorSubmission } from "../../contracts/ports/PrintConnectorPort";

/**
 * PRINTING-1 — transport stub until PRINT-CONNECTOR-1. Does not touch OS or printers.
 */
export class NoOpPrintConnectorPort implements PrintConnectorPort {
  async submit(submission: PrintConnectorSubmission): Promise<void> {
    opsLog({
      type: OPS_EVENT.print_connector_submission,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      restaurantId: submission.restaurantId,
      metadata: {
        jobId: submission.jobId,
        orderId: submission.orderId,
        correlationId: submission.correlationId,
        payloadSchemaVersion: submission.payload.schemaVersion,
        lineItemCount: submission.payload.lineItems.length,
      },
    });
  }
}
