export const DEPLOYMENT_TARGETS = [
  "embedded",
  "local_desktop",
  "android",
  "edge",
  "future",
] as const;

export type DeploymentTarget = (typeof DEPLOYMENT_TARGETS)[number];

export function isDeploymentTarget(value: string): value is DeploymentTarget {
  return (DEPLOYMENT_TARGETS as readonly string[]).includes(value);
}

export type RuntimeIdentity = {
  target: DeploymentTarget;
  instanceId: string;
  label: string;
};

export type RuntimeCapabilities = {
  supportsLocalDiscovery: boolean;
  supportsRemoteExecution: boolean;
  supportsBackgroundExecution: boolean;
  supportsInProcessExecution: boolean;
};

export type DeploymentDescriptor = {
  identity: RuntimeIdentity;
  capabilities: RuntimeCapabilities;
};
