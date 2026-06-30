import type { DeploymentTarget } from "../../print-connector/contracts/deployment/DeploymentContracts";

export type LocalConnectorConfig = {
  cloudEndpoint: string;
  restaurantId: number;
  connectorId: string;
  credentialSecret: string;
  runtimeId: string;
  deploymentType: DeploymentTarget;
  platform: string;
  architecture: string;
  connectorVersion: string;
  hostLabel: string;
  hostFingerprint: string | null;
  heartbeatIntervalMs: number;
};

export interface LocalConnectorConfigProvider {
  load(): LocalConnectorConfig;
}
