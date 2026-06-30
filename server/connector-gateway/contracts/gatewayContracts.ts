import type { DeploymentTarget } from "../../print-connector/contracts/deployment/DeploymentContracts";

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
