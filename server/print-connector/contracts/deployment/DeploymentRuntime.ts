import type { PlatformAdapter } from "../PlatformAdapter";
import type { TransportAdapter } from "../TransportAdapter";
import type { DeploymentDescriptor } from "./DeploymentContracts";

/**
 * Deployment runtime — where and how connector adapters execute.
 * Does not assume HTTP, localhost, background process, or a specific host OS.
 */
export interface DeploymentRuntime {
  readonly descriptor: DeploymentDescriptor;

  getPlatformAdapter(): PlatformAdapter;

  getTransportAdapters(): TransportAdapter[];
}
