import type { ProvisioningUrlState } from "./provisioningUrl";

export type FleetProvisioningAction = "status" | "resume" | "rotate";

export type FleetProvisioningNavigation = {
  restaurantId: number;
  mode: ProvisioningUrlState["mode"];
  sessionId?: string | null;
  deviceId?: string | null;
};

/**
 * BUGFIX-F003 — fleet handoff must never map Status/Resume to Rotate.
 */
export function resolveFleetProvisioningNavigation(input: {
  action: FleetProvisioningAction;
  restaurantId: number;
  deviceId: string;
  findSessionByDevice: (deviceId: string) => { sessionId: string } | null;
}): FleetProvisioningNavigation {
  const { action, restaurantId, deviceId, findSessionByDevice } = input;

  if (action === "status") {
    return { restaurantId, mode: "status", deviceId };
  }

  if (action === "resume") {
    const existing = findSessionByDevice(deviceId);
    if (existing) {
      return { restaurantId, mode: "resume", sessionId: existing.sessionId };
    }
    return { restaurantId, mode: "resume", deviceId };
  }

  return { restaurantId, mode: "rotate", deviceId };
}

/** True when rotate must not run until the operator confirms explicitly. */
export function requiresRotateConfirmation(urlState: ProvisioningUrlState): boolean {
  return urlState.mode === "rotate" && urlState.deviceId != null && urlState.deviceId.length > 0;
}

/** True when automatic rotateToken on mount is forbidden. */
export function allowsAutomaticRotateOnMount(): boolean {
  return false;
}
