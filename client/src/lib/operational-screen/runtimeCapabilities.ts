import {
  rolePermitsKitchenQueue,
  rolePermitsPrintMonitor,
  type OperationalDeviceRole,
} from "../../../../server/operational-device/domain/deviceRoles";
import type { ClientCapabilities, RuntimeCapabilitySet, ServerCapabilities } from "./runtimeTypes";

export function deriveServerCapabilities(role: OperationalDeviceRole): ServerCapabilities {
  const canAccessKitchenQueue = rolePermitsKitchenQueue(role);
  const canAccessPrintMonitor = rolePermitsPrintMonitor(role);
  return {
    role,
    canAccessKitchenQueue,
    canAccessPrintMonitor,
    runtimeApiReady: canAccessKitchenQueue || canAccessPrintMonitor,
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

export function isBlockedRole(role: OperationalDeviceRole): boolean {
  return !rolePermitsKitchenQueue(role) && !rolePermitsPrintMonitor(role);
}
