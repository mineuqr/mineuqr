import type { DeploymentTarget } from "../../print-connector/contracts/deployment/DeploymentContracts";
import type { ConnectorCapability } from "../../connector-gateway/contracts/gatewayContracts";

export type LocalConnectorLifecycle =
  | "stopped"
  | "starting"
  | "connecting"
  | "authenticating"
  | "registered"
  | "healthy"
  | "degraded"
  | "stopping";

export type LocalConnectorRuntimeIdentity = {
  connectorId: string;
  runtimeId: string;
  restaurantId: number;
  deploymentType: DeploymentTarget;
  platform: string;
  architecture: string;
  connectorVersion: string;
  capabilities: ConnectorCapability;
  hostFingerprint: string | null;
  hostLabel: string;
};

export type LocalConnectorSessionState = {
  sessionId: string | null;
  connectionId: string | null;
  lastHeartbeatAt: string | null;
  lastAuthAt: string | null;
  registeredAt: string | null;
};

export type LocalConnectorHealthSnapshot = {
  lifecycle: LocalConnectorLifecycle;
  connectorStatus: "offline" | "connecting" | "online" | "degraded";
  gatewayConnectivity: "disconnected" | "connected";
  sessionState: LocalConnectorSessionState;
  platformAvailable: boolean;
  uptimeMs: number;
  version: string;
  capabilities: ConnectorCapability;
  evaluatedAt: string;
};

export type LocalConnectorDiagnosticsSnapshot = {
  identity: LocalConnectorRuntimeIdentity;
  configuration: {
    cloudEndpoint: string;
    heartbeatIntervalMs: number;
    deploymentType: DeploymentTarget;
  };
  gatewayConnection: {
    connected: boolean;
    connectionId: string | null;
  };
  session: LocalConnectorSessionState;
  health: LocalConnectorHealthSnapshot;
  deployment: {
    deploymentType: DeploymentTarget;
    platform: string;
    architecture: string;
  };
};

export { MINEUQR_CONNECTOR_VERSION as LOCAL_CONNECTOR_VERSION } from "../../connector-product/release/connectorReleaseConstants.generated";
