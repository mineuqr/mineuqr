import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import { PrintConnectorRuntime } from "../../print-connector/runtime/PrintConnectorRuntime";
import { InMemoryPrinterSelectionRepository } from "../infrastructure/InMemoryPrinterSelectionRepository";
import type { LocalConnectorRuntimeIdentity } from "../contracts/localContracts";
import { RlcWindowsDeploymentRuntime } from "./RlcWindowsDeploymentRuntime";

export function isRlcWindowsHost(): boolean {
  return process.platform === "win32";
}

export function isRlcProductionRuntime(): boolean {
  return process.env.RLC_RUNTIME === "1";
}

/**
 * Creates RLC connector runtime with native Windows platform adapter.
 */
export function createRlcWindowsConnectorRuntime(
  identity: LocalConnectorRuntimeIdentity
): PrintConnectorApi {
  const deployment = new RlcWindowsDeploymentRuntime(identity);
  return new PrintConnectorRuntime(deployment, new InMemoryPrinterSelectionRepository());
}
