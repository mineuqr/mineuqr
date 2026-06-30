import type { DeploymentTarget } from "../../print-connector/contracts/deployment/DeploymentContracts";
import type { ConnectorCapability } from "../../connector-gateway/contracts/gatewayContracts";
import type { PrintPayload } from "../../printing/domain/PrintPayload";
import type { InfrastructureFailureCode } from "./sessionFailureContracts";

export type ConnectorSessionLifecycle =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "registered"
  | "healthy"
  | "degraded";

export type ConnectorRegistrationIdentity = {
  connectorId: string;
  restaurantId: number;
  runtimeId: string;
  platform: string;
  version: string;
  deploymentType: DeploymentTarget;
  capabilities: ConnectorCapability;
  hostFingerprint: string | null;
};

export type ConnectorAuthMetadata = {
  credentialId: string;
  issuedAt: string;
  expiresAt: string | null;
  renewedAt: string | null;
};

export type LiveConnectorSession = {
  sessionId: string;
  identity: ConnectorRegistrationIdentity;
  lifecycle: ConnectorSessionLifecycle;
  auth: ConnectorAuthMetadata;
  transportConnectionId: string;
  connectedAt: string;
  lastHeartbeatAt: string | null;
};

export type ConnectorAuthRequest = {
  restaurantId: number;
  connectorId: string;
  runtimeId: string;
  credentialSecret: string;
  version: string;
  platform: string;
};

export type ConnectorAuthResult = {
  success: boolean;
  sessionId: string | null;
  failureCode: InfrastructureFailureCode | null;
  message: string | null;
};

export type ConnectorRegisterRequest = {
  sessionId: string;
  restaurantId: number;
  connectorId: string;
  runtimeId: string;
  platform: string;
  version: string;
  deploymentType: DeploymentTarget;
  capabilities: ConnectorCapability;
  hostFingerprint: string | null;
  hostLabel: string;
};

export type ConnectorRegisterResult = {
  success: boolean;
  failureCode: InfrastructureFailureCode | null;
  message: string | null;
};

export type ConnectorHeartbeatRequest = {
  sessionId: string;
  restaurantId: number;
  connectorId: string;
  version: string;
  capabilities: ConnectorCapability;
  receivedAt: string;
};

export type ConnectorHeartbeatResult = {
  success: boolean;
  lifecycle: ConnectorSessionLifecycle | null;
  failureCode: InfrastructureFailureCode | null;
  message: string | null;
};

export type ConnectorCommandType =
  | "execute_print"
  | "discover_printers"
  | "get_printer_status"
  | "cancel_print";

export type ConnectorCommandEnvelope = {
  commandId: string;
  type: ConnectorCommandType;
  restaurantId: number;
  connectorId: string;
  correlationId: string | null;
  issuedAt: string;
  nonce: string;
  payload: unknown;
};

export type ConnectorCommandResponse = {
  commandId: string;
  success: boolean;
  failureCode: InfrastructureFailureCode | null;
  message: string | null;
  payload: unknown | null;
};

export type ExecutePrintCommandPayload = {
  jobId: number;
  orderId: number;
  printPayload: PrintPayload;
  printerId?: string;
};

export type CancelPrintCommandPayload = {
  executionId: string;
  printJobId: number;
};

export type PairingTokenIssue = {
  token: string;
  restaurantId: number;
  expiresAt: string;
};

export type ConnectorEnrollmentStatus = "active" | "revoked";

export type ConnectorCredentialRecord = {
  credentialId: string;
  restaurantId: number;
  secretHash: string;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  connectorInstanceId: string | null;
  status?: ConnectorEnrollmentStatus;
  lastSeenAt?: string | null;
  connectorVersion?: string | null;
};
