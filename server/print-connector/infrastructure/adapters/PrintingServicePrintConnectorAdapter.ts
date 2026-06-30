import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import type {
  PrintConnectorCancelRequest,
  PrintConnectorPort,
  PrintConnectorSubmission,
  PrintConnectorSubmissionResult,
} from "../../../printing/contracts/ports/PrintConnectorPort";
import type { PrintResultPort } from "../../../printing/contracts/ports/PrintResultPort";
import type { ConnectorRuntime } from "../../contracts/deployment/ConnectorRuntime";

/**
 * Bridges Printing Service dispatch to Connector Runtime without leaking platform details.
 */
export class PrintingServicePrintConnectorAdapter implements PrintConnectorPort {
  constructor(
    private readonly runtime: ConnectorRuntime,
    private readonly printResultPort: PrintResultPort
  ) {}

  async submit(submission: PrintConnectorSubmission): Promise<PrintConnectorSubmissionResult> {
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
        executionMode: "embedded",
      },
    });

    const result = await this.runtime.print({
      restaurantId: submission.restaurantId,
      printJobId: submission.jobId,
      orderId: submission.orderId,
      payload: submission.payload,
    });

    if (result.success) {
      await this.printResultPort.reportPrintSuccess({
        jobId: submission.jobId,
        restaurantId: submission.restaurantId,
      });
      return { executionId: result.executionId };
    }

    await this.printResultPort.reportPrintFailure({
      jobId: submission.jobId,
      restaurantId: submission.restaurantId,
      error: result.message ?? result.failureReason ?? "print_failed",
    });
    return { executionId: result.executionId };
  }

  async cancel(request: PrintConnectorCancelRequest): Promise<void> {
    if (!request.executionId) {
      return;
    }

    await this.runtime.cancel({
      restaurantId: request.restaurantId,
      executionId: request.executionId,
      printJobId: request.jobId,
    });
  }
}
