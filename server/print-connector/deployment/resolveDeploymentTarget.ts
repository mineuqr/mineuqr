import {
  type DeploymentTarget,
  isDeploymentTarget,
} from "../contracts/deployment/DeploymentContracts";

const DEFAULT_DEPLOYMENT_TARGET: DeploymentTarget = "embedded";

/**
 * Resolves deployment target from environment. Composition-root only.
 */
export function resolveDeploymentTarget(): DeploymentTarget {
  const configured = process.env.PRINT_CONNECTOR_DEPLOYMENT?.trim().toLowerCase();
  if (configured && isDeploymentTarget(configured)) {
    return configured;
  }
  return DEFAULT_DEPLOYMENT_TARGET;
}

export { DEFAULT_DEPLOYMENT_TARGET };
