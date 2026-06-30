import type { DeploymentTarget } from "../../print-connector/contracts/deployment/DeploymentContracts";
import type { SelectedPrinterDto } from "../../print-connector/contracts/PrintConnectorApi";
import type { PrintExecutionResult } from "../../print-connector/domain/PrintExecutionResult";
import type { PrinterCapability } from "../../print-connector/domain/PrinterCapability";
import type { PrinterInfo } from "../../print-connector/domain/PrinterInfo";
import type { PrinterStatus } from "../../print-connector/domain/PrinterStatus";
import type { PrintPayload } from "../../printing/domain/PrintPayload";

export type ConnectorAvailability = "online" | "degraded" | "offline" | "unregistered";

export type ConnectorIdentity = {
  restaurantId: number;
  connectorInstanceId: string;
  deploymentTarget: DeploymentTarget;
};

export type ConnectorEndpoint = {
  hostLabel: string;
  processPlatform: string;
};

export type ConnectorRuntimeInfo = {
  identity: ConnectorIdentity;
  endpoint: ConnectorEndpoint;
  registeredAt: string;
  lastHeartbeatAt: string | null;
};

export type ConnectorMetadata = {
  label: string;
  version: string | null;
  hostFingerprint: string | null;
};

export type ConnectorCapability = {
  supportsLocalDiscovery: boolean;
  supportsRemoteExecution: boolean;
  supportsBackgroundExecution: boolean;
  supportsInProcessExecution: boolean;
};

export type ConnectorStatus = {
  availability: ConnectorAvailability;
  isRegistered: boolean;
  isHealthy: boolean;
  lastSeenAt: string | null;
  message: string | null;
};

export type ConnectorHealth = {
  identity: ConnectorIdentity;
  status: ConnectorStatus;
  heartbeatAgeMs: number | null;
  evaluatedAt: string;
};

export type ConnectorHeartbeat = {
  restaurantId: number;
  connectorInstanceId: string;
  receivedAt: string;
};

export type ConnectorSession = {
  identity: ConnectorIdentity;
  metadata: ConnectorMetadata;
  capabilities: ConnectorCapability;
  runtime: ConnectorRuntimeInfo;
  status: ConnectorStatus;
};

export type ConnectorRegistrationCommand = {
  restaurantId: number;
  connectorInstanceId: string;
  deploymentTarget: DeploymentTarget;
  metadata: ConnectorMetadata;
  capabilities: ConnectorCapability;
  endpoint: ConnectorEndpoint;
};

export type ConnectorRegistrationResult = {
  identity: ConnectorIdentity;
  session: ConnectorSession;
  registeredAt: string;
};

export type GatewayPrintRouteRequest = {
  jobId: number;
  restaurantId: number;
  orderId: number;
  correlationId: string | null;
  payload: PrintPayload;
  printerId?: string;
  requestedAt: string;
};

export type GatewayPrintRouteResult = {
  routed: boolean;
  connectorInstanceId: string | null;
  failureReason:
    | "connector_offline"
    | "connector_unregistered"
    | "transport_unavailable"
    | null;
  message: string | null;
};

export type GatewayDiscoverPrintersRequest = {
  restaurantId: number;
  requestedAt: string;
};

export type GatewayDiscoverPrintersResult = {
  routed: boolean;
  connectorInstanceId: string | null;
  printers: PrinterInfo[] | null;
  failureReason:
    | "connector_offline"
    | "connector_unregistered"
    | "transport_unavailable"
    | null;
  message: string | null;
};

export type GatewayPrinterStatusRequest = {
  restaurantId: number;
  printerId: string;
  requestedAt: string;
};

export type GatewayPrinterStatusResult = {
  routed: boolean;
  connectorInstanceId: string | null;
  status: PrinterStatus | null;
  capabilities: PrinterCapability | null;
  failureReason:
    | "connector_offline"
    | "connector_unregistered"
    | "transport_unavailable"
    | null;
  message: string | null;
};

export type GatewaySelectPrinterRequest = {
  restaurantId: number;
  printerId: string;
  printerName: string;
  platform: string;
  transport: string;
  requestedAt: string;
};

export type GatewaySelectPrinterResult = {
  routed: boolean;
  connectorInstanceId: string | null;
  selected: SelectedPrinterDto | null;
  failureReason:
    | "connector_offline"
    | "connector_unregistered"
    | "transport_unavailable"
    | null;
  message: string | null;
};

export type GatewayExecutePrintResult = {
  routed: boolean;
  connectorInstanceId: string | null;
  execution: PrintExecutionResult | null;
  failureReason:
    | "connector_offline"
    | "connector_unregistered"
    | "transport_unavailable"
    | null;
  message: string | null;
};

export type GatewayCancelPrintRequest = {
  restaurantId: number;
  executionId: string;
  printJobId: number;
  requestedAt: string;
};

export type GatewayCancelPrintResult = {
  routed: boolean;
  connectorInstanceId: string | null;
  execution: PrintExecutionResult | null;
  failureReason:
    | "connector_offline"
    | "connector_unregistered"
    | "transport_unavailable"
    | null;
  message: string | null;
};
