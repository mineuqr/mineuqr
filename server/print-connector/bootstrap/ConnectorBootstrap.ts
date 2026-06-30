import type {
  ConnectorBootstrap,
  ConnectorBootstrapConfig,
  ConnectorBootstrapResult,
} from "../contracts/deployment/ConnectorBootstrap";
import type { PrinterSelectionRepository } from "../contracts/PrinterSelectionRepository";
import { createDeploymentRuntime } from "../deployment/DeploymentRuntimes";
import { resolveDeploymentTarget } from "../deployment/resolveDeploymentTarget";
import { PrintConnectorRuntime } from "../runtime/PrintConnectorRuntime";

export class DefaultConnectorBootstrap implements ConnectorBootstrap {
  constructor(private readonly selectionRepository: PrinterSelectionRepository) {}

  compose(config?: ConnectorBootstrapConfig): ConnectorBootstrapResult {
    const deploymentTarget = config?.deploymentTarget ?? resolveDeploymentTarget();
    const deploymentRuntime = createDeploymentRuntime(deploymentTarget);
    const connectorRuntime = new PrintConnectorRuntime(
      deploymentRuntime,
      this.selectionRepository
    );

    return {
      deploymentRuntime,
      connectorRuntime,
    };
  }
}

export function bootstrapPrintConnector(
  selectionRepository: PrinterSelectionRepository,
  config?: ConnectorBootstrapConfig
): ConnectorBootstrapResult {
  return new DefaultConnectorBootstrap(selectionRepository).compose(config);
}
