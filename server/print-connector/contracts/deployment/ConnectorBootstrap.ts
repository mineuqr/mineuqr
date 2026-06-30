import type { DeploymentRuntime } from "./DeploymentRuntime";
import type { ConnectorRuntime } from "./ConnectorRuntime";
import type { DeploymentTarget } from "./DeploymentContracts";

export type ConnectorBootstrapConfig = {
  deploymentTarget?: DeploymentTarget;
};

export type ConnectorBootstrapResult = {
  deploymentRuntime: DeploymentRuntime;
  connectorRuntime: ConnectorRuntime;
};

export interface ConnectorBootstrap {
  compose(config?: ConnectorBootstrapConfig): ConnectorBootstrapResult;
}
