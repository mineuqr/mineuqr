import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import type {
  ProvisioningActivationState,
  ProvisioningPairingState,
  ProvisioningSession,
  ProvisioningStatus,
} from "./provisioningSessionContract";

export type DeviceSnapshot = {
  hasActiveToken: boolean;
  presence: "online" | "offline" | "never_seen";
  operationalState: string;
  businessReadiness: string;
  deviceStatus: "active" | "disabled";
};

function resolvePairingState(
  session: ProvisioningSession,
  snapshot: DeviceSnapshot | null
): ProvisioningPairingState {
  if (!session.credentials && !session.tokenId) return "unpaired";
  if (snapshot && !snapshot.hasActiveToken) return "revoked";
  if (!snapshot || snapshot.presence === "never_seen") return session.credentials ? "pairing" : "unpaired";
  return "paired";
}

function resolveActivationState(
  snapshot: DeviceSnapshot | null,
  pairingState: ProvisioningPairingState
): ProvisioningActivationState {
  if (!snapshot || pairingState !== "paired") return "pending";
  if (snapshot.deviceStatus === "disabled") return "failed";
  if (snapshot.operationalState === "blocked") return "blocked";
  if (snapshot.operationalState === "operational") return "operational";
  if (snapshot.operationalState === "initializing") return "loading_runtime";
  if (snapshot.operationalState === "ready") return "loading_configuration";
  if (snapshot.presence === "online") return "loading_capabilities";
  return "pending";
}

function resolveProvisioningStatus(
  session: ProvisioningSession,
  pairingState: ProvisioningPairingState,
  activationState: ProvisioningActivationState,
  expired: boolean
): ProvisioningStatus {
  if (expired) return "expired";
  if (session.errors.length > 0 && session.status === "failed") return "failed";
  if (session.status === "cancelled") return "cancelled";
  if (!session.credentials) return "created";
  if (pairingState === "unpaired") return "created";
  if (pairingState === "pairing") return session.credentials ? "waiting_for_pairing" : "credentials_ready";
  if (pairingState === "revoked") return "failed";
  if (activationState === "operational") return "operational";
  if (activationState === "blocked" || activationState === "failed") return "activating";
  if (pairingState === "paired" && activationState !== "pending") return "activating";
  if (pairingState === "paired") return "connected";
  return "pairing";
}

export function projectProvisioningFromSnapshot(
  session: ProvisioningSession,
  snapshot: DeviceSnapshot | null,
  now: number = Date.now()
): ProvisioningSession {
  const expired = Date.parse(session.expiresAt) <= now;
  const pairingState = resolvePairingState(session, snapshot);
  const activationState = resolveActivationState(snapshot, pairingState);
  const status = resolveProvisioningStatus(session, pairingState, activationState, expired);

  return {
    ...session,
    status,
    pairingState,
    activationState,
    updatedAt: new Date(now).toISOString(),
  };
}

export function deviceSnapshotFromFleet(screen: FleetScreenReadModel): DeviceSnapshot {
  return {
    hasActiveToken: screen.healthSummary.hasActiveToken,
    presence: screen.healthSummary.presence,
    operationalState: screen.canonicalState.operationalState,
    businessReadiness: screen.businessReadiness,
    deviceStatus:
      screen.canonicalState.maintenanceState === "maintenance" ? "disabled" : "active",
  };
}
