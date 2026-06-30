import { randomUUID } from "node:crypto";
import type { PlatformAdapter } from "../contracts/PlatformAdapter";
import type { TransportAdapter } from "../contracts/TransportAdapter";
import type {
  DeploymentDescriptor,
  DeploymentTarget,
  RuntimeCapabilities,
  RuntimeIdentity,
} from "../contracts/deployment/DeploymentContracts";
import type { DeploymentRuntime } from "../contracts/deployment/DeploymentRuntime";
import { createPlatformAdapter } from "../platform/createPlatformAdapter";
import { createTransportAdapters } from "../transport/TransportAdapters";

function createIdentity(target: DeploymentTarget, label: string): RuntimeIdentity {
  return {
    target,
    instanceId: randomUUID(),
    label,
  };
}

function embeddedCapabilities(): RuntimeCapabilities {
  return {
    supportsLocalDiscovery: true,
    supportsRemoteExecution: false,
    supportsBackgroundExecution: false,
    supportsInProcessExecution: true,
  };
}

/**
 * Shared adapter wiring for deployment runtimes that execute in-process today.
 */
export abstract class InProcessDeploymentRuntime implements DeploymentRuntime {
  abstract readonly descriptor: DeploymentDescriptor;

  private readonly platform: PlatformAdapter;
  private readonly transports: TransportAdapter[];

  constructor() {
    this.platform = createPlatformAdapter();
    this.transports = createTransportAdapters();
  }

  getPlatformAdapter(): PlatformAdapter {
    return this.platform;
  }

  getTransportAdapters(): TransportAdapter[] {
    return this.transports;
  }
}

export class EmbeddedDeploymentRuntime extends InProcessDeploymentRuntime {
  readonly descriptor: DeploymentDescriptor = {
    identity: createIdentity("embedded", "Embedded API Process Runtime"),
    capabilities: embeddedCapabilities(),
  };
}

export class LocalDesktopDeploymentRuntime extends InProcessDeploymentRuntime {
  readonly descriptor: DeploymentDescriptor = {
    identity: createIdentity("local_desktop", "Local Desktop Runtime"),
    capabilities: {
      ...embeddedCapabilities(),
      supportsBackgroundExecution: true,
    },
  };
}

export class AndroidDeploymentRuntime extends InProcessDeploymentRuntime {
  readonly descriptor: DeploymentDescriptor = {
    identity: createIdentity("android", "Android Runtime"),
    capabilities: {
      supportsLocalDiscovery: true,
      supportsRemoteExecution: false,
      supportsBackgroundExecution: false,
      supportsInProcessExecution: true,
    },
  };
}

export class EdgeDeploymentRuntime extends InProcessDeploymentRuntime {
  readonly descriptor: DeploymentDescriptor = {
    identity: createIdentity("edge", "Edge Runtime"),
    capabilities: {
      supportsLocalDiscovery: true,
      supportsRemoteExecution: true,
      supportsBackgroundExecution: true,
      supportsInProcessExecution: false,
    },
  };
}

export class FutureDeploymentRuntime extends InProcessDeploymentRuntime {
  readonly descriptor: DeploymentDescriptor = {
    identity: createIdentity("future", "Future Runtime Placeholder"),
    capabilities: {
      supportsLocalDiscovery: false,
      supportsRemoteExecution: false,
      supportsBackgroundExecution: false,
      supportsInProcessExecution: false,
    },
  };
}

export const DEPLOYMENT_RUNTIME_FACTORIES: Record<
  DeploymentTarget,
  () => DeploymentRuntime
> = {
  embedded: () => new EmbeddedDeploymentRuntime(),
  local_desktop: () => new LocalDesktopDeploymentRuntime(),
  android: () => new AndroidDeploymentRuntime(),
  edge: () => new EdgeDeploymentRuntime(),
  future: () => new FutureDeploymentRuntime(),
};

export function createDeploymentRuntime(target: DeploymentTarget): DeploymentRuntime {
  return DEPLOYMENT_RUNTIME_FACTORIES[target]();
}
