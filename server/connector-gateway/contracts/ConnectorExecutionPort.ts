import type { PrinterCapability } from "../../print-connector/domain/PrinterCapability";
import type { PrinterInfo } from "../../print-connector/domain/PrinterInfo";
import type { PrinterStatus } from "../../print-connector/domain/PrinterStatus";
import type { PrintExecutionResult } from "../../print-connector/domain/PrintExecutionResult";
import type { SelectedPrinterDto } from "../../print-connector/contracts/PrintConnectorApi";
import type {
  GatewayCancelPrintRequest,
  GatewayPrintRouteRequest,
  GatewaySelectPrinterRequest,
} from "./gatewayContracts";

/**
 * Transport to RLC — gateway routes only; this port executes cross-process delivery.
 */
export type ConnectorExecutionResult = {
  success: boolean;
  execution?: PrintExecutionResult;
  failureReason?: string;
  message?: string;
};

export type ConnectorDiscoveryExecutionResult = {
  success: boolean;
  printers?: PrinterInfo[];
  failureReason?: string;
  message?: string;
};

export type ConnectorPrinterStatusExecutionResult = {
  success: boolean;
  status?: PrinterStatus | null;
  capabilities?: PrinterCapability | null;
  failureReason?: string;
  message?: string;
};

export type ConnectorSelectPrinterExecutionResult = {
  success: boolean;
  selected?: SelectedPrinterDto;
  failureReason?: string;
  message?: string;
};

export type ConnectorCancelPrintExecutionResult = {
  success: boolean;
  execution?: PrintExecutionResult;
  failureReason?: string;
  message?: string;
};

export interface ConnectorExecutionPort {
  executePrint(
    connectorInstanceId: string,
    request: GatewayPrintRouteRequest
  ): Promise<ConnectorExecutionResult>;

  executeDiscoverPrinters(
    connectorInstanceId: string,
    restaurantId: number
  ): Promise<ConnectorDiscoveryExecutionResult>;

  executeGetPrinterStatus(
    connectorInstanceId: string,
    restaurantId: number,
    printerId: string
  ): Promise<ConnectorPrinterStatusExecutionResult>;

  executeSelectPrinter(
    connectorInstanceId: string,
    request: GatewaySelectPrinterRequest
  ): Promise<ConnectorSelectPrinterExecutionResult>;

  executeCancelPrint(
    connectorInstanceId: string,
    request: GatewayCancelPrintRequest
  ): Promise<ConnectorCancelPrintExecutionResult>;
}
