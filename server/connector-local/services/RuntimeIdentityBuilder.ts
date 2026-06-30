import type { ConnectorCapability } from "../../connector-gateway/contracts/gatewayContracts";
import type { LocalConnectorConfig } from "../contracts/LocalConnectorConfig";
import type { LocalConnectorRuntimeIdentity } from "../contracts/localContracts";

export function buildRuntimeCapabilities(): ConnectorCapability {
  return {
    supportsLocalDiscovery: true,
    supportsRemoteExecution: true,
    supportsBackgroundExecution: true,
    supportsInProcessExecution: false,
  };
}

export function buildRuntimeIdentity(config: LocalConnectorConfig): LocalConnectorRuntimeIdentity {
  return {
    connectorId: config.connectorId,
    runtimeId: config.runtimeId,
    restaurantId: config.restaurantId,
    deploymentType: config.deploymentType,
    platform: config.platform,
    architecture: config.architecture,
    connectorVersion: config.connectorVersion,
    capabilities: buildRuntimeCapabilities(),
    hostFingerprint: config.hostFingerprint,
    hostLabel: config.hostLabel,
  };
}
