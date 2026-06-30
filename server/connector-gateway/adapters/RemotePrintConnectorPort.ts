import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import type {
  PrintConnectorPort,
  PrintConnectorSubmission,
} from "../../printing/contracts/ports/PrintConnectorPort";
import type { PrintResultPort } from "../../printing/contracts/ports/PrintResultPort";
import type { ConnectorGatewayService } from "../services/ConnectorGatewayService";

/**
 * Remote PrintConnectorPort — cloud gateway delegates to RLC via ConnectorGatewayService.
 * Business layers remain unaware of embedded vs remote execution.
 */
export class RemotePrintConnectorPort implements PrintConnectorPort {
  constructor(
    private readonly gateway: ConnectorGatewayService,
    private readonly printResultPort: PrintResultPort
  ) {}

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
        executionMode: "remote",
      },
    });

    const route = await this.gateway.routePrint({
      jobId: submission.jobId,
      restaurantId: submission.restaurantId,
      orderId: submission.orderId,
      correlationId: submission.correlationId,
      payload: submission.payload,
      requestedAt: new Date().toISOString(),
    });

    if (route.routed) {
      await this.printResultPort.reportPrintSuccess({
        jobId: submission.jobId,
        restaurantId: submission.restaurantId,
      });
      return;
    }

    await this.printResultPort.reportPrintFailure({
      jobId: submission.jobId,
      restaurantId: submission.restaurantId,
      error: route.message ?? route.failureReason ?? "connector_route_failed",
    });
  }
}
