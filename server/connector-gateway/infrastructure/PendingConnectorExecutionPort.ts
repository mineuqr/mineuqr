import type {
  ConnectorCancelPrintExecutionResult,
  ConnectorDiscoveryExecutionResult,
  ConnectorExecutionPort,
  ConnectorExecutionResult,
  ConnectorPrinterStatusExecutionResult,
  ConnectorSelectPrinterExecutionResult,
} from "../contracts/ConnectorExecutionPort";
import type { GatewayPrintRouteRequest } from "../contracts/gatewayContracts";

/**
 * Placeholder until PRINT-CONNECTOR-NETWORK-1 delivers RLC transport.
 */
export class PendingConnectorExecutionPort implements ConnectorExecutionPort {
  async executePrint(
    _connectorInstanceId: string,
    _request: GatewayPrintRouteRequest
  ): Promise<ConnectorExecutionResult> {
    return {
      success: false,
      failureReason: "transport_unavailable",
      message: "Connector transport not implemented",
    };
  }

  async executeDiscoverPrinters(
    _connectorInstanceId: string,
    _restaurantId: number
  ): Promise<ConnectorDiscoveryExecutionResult> {
    return {
      success: false,
      failureReason: "transport_unavailable",
      message: "Connector transport not implemented",
    };
  }

  async executeGetPrinterStatus(
    _connectorInstanceId: string,
    _restaurantId: number,
    _printerId: string
  ): Promise<ConnectorPrinterStatusExecutionResult> {
    return {
      success: false,
      failureReason: "transport_unavailable",
      message: "Connector transport not implemented",
    };
  }

  async executeSelectPrinter(): Promise<ConnectorSelectPrinterExecutionResult> {
    return {
      success: false,
      failureReason: "transport_unavailable",
      message: "Connector transport not implemented",
    };
  }

  async executeCancelPrint(): Promise<ConnectorCancelPrintExecutionResult> {
    return {
      success: false,
      failureReason: "transport_unavailable",
      message: "Connector transport not implemented",
    };
  }
}
