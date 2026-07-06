import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import type { ServerCapabilities } from "../runtimeTypes";
import { isBlockedRole } from "../runtimeCapabilities";
import type { RuntimeCapabilityContract } from "./runtimeCapabilityContract";
import { runtimeCapabilityNegotiator } from "./runtimeCapabilityNegotiator";

export function buildCapabilityNegotiationInput(
  role: OperationalDeviceRole,
  server: ServerCapabilities,
  options?: {
    configurationActivated?: boolean;
    densityActivated?: boolean;
    categoriesActivated?: boolean;
    operationalBlocked?: boolean;
    deviceDisabled?: boolean;
    runtimeVersion?: string;
  }
) {
  return {
    role,
    runtimeVersion: options?.runtimeVersion ?? import.meta.env.VITE_APP_VERSION ?? "web",
    configurationActivated: options?.configurationActivated ?? false,
    densityActivated: options?.densityActivated ?? false,
    categoriesActivated: options?.categoriesActivated ?? false,
    canAccessKitchenQueue: server.canAccessKitchenQueue,
    canAccessPrintMonitor: server.canAccessPrintMonitor,
    operationalBlocked: options?.operationalBlocked ?? isBlockedRole(role),
    deviceDisabled: options?.deviceDisabled ?? false,
  };
}

export function negotiateRuntimeCapabilities(
  role: OperationalDeviceRole,
  server: ServerCapabilities,
  options?: Parameters<typeof buildCapabilityNegotiationInput>[2]
): RuntimeCapabilityContract {
  return runtimeCapabilityNegotiator.negotiate(
    buildCapabilityNegotiationInput(role, server, options)
  );
}
