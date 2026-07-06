import type { RuntimeCapabilityContract } from "./runtimeCapabilityContract";
import type { RoleRuntimeHealth } from "../roles/runtimeRoleContract";

export type CapabilityHealthExtension = {
  capabilityContractVersion: number;
  negotiationSummary: RuntimeCapabilityContract["negotiationSummary"];
  unavailableCapabilities: string[];
  blockedCapabilities: string[];
  negotiationFailures: RuntimeCapabilityContract["negotiationSummary"]["failures"];
};

export function projectCapabilityHealthExtension(
  contract: RuntimeCapabilityContract
): CapabilityHealthExtension {
  return {
    capabilityContractVersion: contract.version,
    negotiationSummary: contract.negotiationSummary,
    unavailableCapabilities: contract.negotiationSummary.unavailable,
    blockedCapabilities: contract.negotiationSummary.blocked,
    negotiationFailures: contract.negotiationSummary.failures,
  };
}

export function mergeCapabilityIntoHealth(
  health: RoleRuntimeHealth,
  contract: RuntimeCapabilityContract
): RoleRuntimeHealth & CapabilityHealthExtension {
  return {
    ...health,
    ...projectCapabilityHealthExtension(contract),
  };
}
