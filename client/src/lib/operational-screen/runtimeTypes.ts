import type { OperationalScreenConfig } from "../../../../server/operational-device/domain/screenConfig";
import type { OperationalDeviceRole } from "../../../../server/operational-device/domain/deviceRoles";
import type { OperationalScreenRuntimeFingerprint } from "./runtimeFingerprint";

export type BootstrapPhase =
  | "loading"
  | "validating"
  | "context_ready"
  | "heartbeat_active"
  | "running"
  | "degraded"
  | "revoked"
  | "blocked"
  | "pairing_redirect";

export type RuntimeGetStatusResponse = {
  device: {
    deviceId: string;
    role: OperationalDeviceRole;
    displayName: string;
    restaurantId: number;
    branchId: number | null;
    status: "active" | "disabled";
  };
  screenConfig: OperationalScreenConfig;
  configVersion: string;
  health: {
    presence: "online" | "offline" | "never_seen";
    operational: boolean;
    status: "active" | "disabled";
    reportedVersion: string | null;
    lastSeenAt: string | null;
    hasActiveToken: boolean;
  };
};

/** Server-authoritative capabilities derived from role + runtime APIs. */
export type ServerCapabilities = {
  role: OperationalDeviceRole;
  canAccessKitchenQueue: boolean;
  canAccessPrintMonitor: boolean;
  runtimeApiReady: boolean;
};

/** Client-local environment capabilities — diagnostic and presentation only. */
export type ClientCapabilities = {
  touch: boolean;
  fullscreen: boolean;
  serviceWorker: boolean;
  viewport: { width: number; height: number };
  camera: boolean;
};

export type RuntimeCapabilitySet = {
  server: ServerCapabilities;
  client: ClientCapabilities;
};

export type OperationalScreenRuntimeContext = {
  identity: {
    deviceId: string;
    displayName: string;
    role: OperationalDeviceRole;
    restaurantId: number;
    branchId: number | null;
  };
  configuration: OperationalScreenConfig;
  configVersion: string;
  runtimeStatus: RuntimeGetStatusResponse["health"];
  presentation: {
    language: OperationalScreenConfig["language"];
    direction: OperationalScreenConfig["displayDirection"];
    density: OperationalScreenConfig["displayDensity"];
  };
  capabilities: RuntimeCapabilitySet;
  fingerprint: OperationalScreenRuntimeFingerprint;
  bootstrap: {
    bootedAt: string;
    bootstrapId: string;
    phase: BootstrapPhase;
  };
};
