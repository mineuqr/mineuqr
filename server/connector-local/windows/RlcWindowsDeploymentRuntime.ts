import type { DeploymentDescriptor } from "../../print-connector/contracts/deployment/DeploymentContracts";
import type { DeploymentRuntime } from "../../print-connector/contracts/deployment/DeploymentRuntime";
import type { PlatformAdapter } from "../../print-connector/contracts/PlatformAdapter";
import type { TransportAdapter } from "../../print-connector/contracts/TransportAdapter";
import { WindowsPlatformAdapter } from "../../print-connector/platform/windows/WindowsPlatformAdapter";
import { createTransportAdapters } from "../../print-connector/transport/TransportAdapters";
import type { LocalConnectorRuntimeIdentity } from "../contracts/localContracts";

/**
 * RLC deployment runtime — Windows platform adapter only (ADR-ARCH-016).
 */
export class RlcWindowsDeploymentRuntime implements DeploymentRuntime {
  readonly descriptor: DeploymentDescriptor;
  private readonly platform: PlatformAdapter;
  private readonly transports: TransportAdapter[];

  constructor(identity: LocalConnectorRuntimeIdentity) {
    this.descriptor = {
      identity: {
        target: identity.deploymentType,
        instanceId: identity.runtimeId,
        label: identity.hostLabel,
      },
      capabilities: identity.capabilities,
    };
    this.platform = new WindowsPlatformAdapter();
    this.transports = createTransportAdapters();
  }

  getPlatformAdapter(): PlatformAdapter {
    return this.platform;
  }

  getTransportAdapters(): TransportAdapter[] {
    return this.transports;
  }
}
