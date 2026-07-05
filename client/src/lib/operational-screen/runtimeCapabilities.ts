import {
  rolePermitsKitchenQueue,
  type OperationalDeviceRole,
} from "../../../../server/operational-device/domain/deviceRoles";
import type { ClientCapabilities, RuntimeCapabilitySet, ServerCapabilities } from "./runtimeTypes";
import "./roles/registerRoles";
import { isRoleOperational, resolveRuntimeRole } from "./roles/runtimeRoleRegistry";

export function deriveServerCapabilities(role: OperationalDeviceRole): ServerCapabilities {
  const definition = resolveRuntimeRole(role);
  const operational = definition.metadata.operational;
  const canAccessKitchenQueue = operational && rolePermitsKitchenQueue(role);
  const canAccessPrintMonitor = false;
  return {
    role,
    canAccessKitchenQueue,
    canAccessPrintMonitor,
    runtimeApiReady: canAccessKitchenQueue,
  };
}

export function deriveClientCapabilities(): ClientCapabilities {
  return {
    touch: typeof window !== "undefined" && "ontouchstart" in window,
    fullscreen: typeof document !== "undefined" && document.fullscreenEnabled === true,
    serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    viewport: {
      width: typeof window !== "undefined" ? window.innerWidth : 0,
      height: typeof window !== "undefined" ? window.innerHeight : 0,
    },
    camera:
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function",
  };
}

export function buildRuntimeCapabilitySet(role: OperationalDeviceRole): RuntimeCapabilitySet {
  return {
    server: deriveServerCapabilities(role),
    client: deriveClientCapabilities(),
  };
}

/** Blocked when the registered role is not operational (ROLE-RUNTIME-1). */
export function isBlockedRole(role: OperationalDeviceRole): boolean {
  return !isRoleOperational(role);
}

/** Role-declared capabilities from registry — not hardcoded in UI. */
export function getRoleCapabilities(role: OperationalDeviceRole) {
  return resolveRuntimeRole(role).metadata.capabilities;
}
