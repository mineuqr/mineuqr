import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import type {
  ProvisioningActivationState,
  ProvisioningHealth,
  ProvisioningPairingState,
  ProvisioningStatus,
} from "./provisioningSessionContract";
import { deviceSnapshotFromFleet, type DeviceSnapshot } from "./provisioningStateProjector";

function pairingFromSnapshot(snapshot: DeviceSnapshot): ProvisioningPairingState {
  if (!snapshot.hasActiveToken) return "revoked";
  if (snapshot.presence === "never_seen") return "unpaired";
  return "paired";
}

function activationFromSnapshot(
  snapshot: DeviceSnapshot,
  pairing: ProvisioningPairingState
): ProvisioningActivationState {
  if (pairing !== "paired") return "pending";
  if (snapshot.deviceStatus === "disabled") return "failed";
  if (snapshot.operationalState === "blocked") return "blocked";
  if (snapshot.operationalState === "operational") return "operational";
  if (snapshot.operationalState === "initializing") return "loading_runtime";
  if (snapshot.operationalState === "ready") return "loading_configuration";
  if (snapshot.presence === "online") return "loading_capabilities";
  return "pending";
}

function statusFromSnapshot(
  snapshot: DeviceSnapshot,
  pairing: ProvisioningPairingState,
  activation: ProvisioningActivationState
): ProvisioningStatus {
  if (!snapshot.hasActiveToken) return "failed";
  if (pairing === "unpaired") return "waiting_for_pairing";
  if (activation === "operational") return "operational";
  if (pairing === "paired" && activation !== "pending") return "activating";
  if (pairing === "paired") return "connected";
  return "pairing";
}

/** Read-only operational status projected from fleet read model — no credentials. */
export function projectFleetDeviceStatus(screen: FleetScreenReadModel): ProvisioningHealth {
  const snapshot = deviceSnapshotFromFleet(screen);
  const pairingState = pairingFromSnapshot(snapshot);
  const activationState = activationFromSnapshot(snapshot, pairingState);
  const status = statusFromSnapshot(snapshot, pairingState, activationState);

  return {
    status,
    pairingState,
    activationState,
    expired: false,
    secondsRemaining: 0,
    retryCount: 0,
    rotationCount: 0,
    warningCount: 0,
    errorCount: snapshot.hasActiveToken ? 0 : 1,
  };
}
