import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import type { NegotiationResult } from "./runtimeCapabilityContract";

export type ManagementCapabilityId = "health" | "diagnostics" | "provisioning" | "state";

export type ManagementCapabilityAdapter = {
  capabilityId: ManagementCapabilityId;
  status: NegotiationResult;
  metadata: Record<string, unknown>;
};

export type ManagementCapabilityContract = {
  capabilities: Record<ManagementCapabilityId, ManagementCapabilityAdapter>;
  version: number;
  updatedAt: string;
};

/**
 * Fleet / provisioning management negotiation — no role name checks.
 */
export function negotiateManagementCapabilities(
  screen: FleetScreenReadModel | null
): ManagementCapabilityContract {
  const now = new Date().toISOString();

  if (!screen) {
    return emptyContract(now);
  }

  const disabled = screen.canonicalState.maintenanceState === "maintenance";
  const pairingRequired = screen.businessReadiness === "pairing_required";

  return {
    version: 1,
    updatedAt: now,
    capabilities: {
      health: {
        capabilityId: "health",
        status: disabled ? "blocked" : "supported",
        metadata: { presence: screen.healthSummary.presence },
      },
      diagnostics: {
        capabilityId: "diagnostics",
        status: disabled ? "blocked" : "supported",
        metadata: { operationalState: screen.canonicalState.operationalState },
      },
      provisioning: {
        capabilityId: "provisioning",
        status: disabled ? "blocked" : pairingRequired ? "supported" : "unavailable",
        metadata: { businessReadiness: screen.businessReadiness },
      },
      state: {
        capabilityId: "state",
        status: "supported",
        metadata: {
          operationalState: screen.canonicalState.operationalState,
          connectivityState: screen.canonicalState.connectivityState,
        },
      },
    },
  };
}

function emptyContract(now: string): ManagementCapabilityContract {
  const unavailable = (id: ManagementCapabilityId): ManagementCapabilityAdapter => ({
    capabilityId: id,
    status: "unavailable",
    metadata: {},
  });
  return {
    version: 0,
    updatedAt: now,
    capabilities: {
      health: unavailable("health"),
      diagnostics: unavailable("diagnostics"),
      provisioning: unavailable("provisioning"),
      state: unavailable("state"),
    },
  };
}

export function isManagementCapabilitySupported(
  contract: ManagementCapabilityContract,
  id: ManagementCapabilityId
): boolean {
  return contract.capabilities[id]?.status === "supported";
}
