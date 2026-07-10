import type { OperationalScreenConfig, ScreenLanguage, DisplayDirection } from "../../../../server/operational-device/domain/screenConfig";
import type { OperationalDeviceRole } from "../../../../server/operational-device/domain/deviceRoles";
import type { OperationalScreenRuntimeFingerprint } from "./runtimeFingerprint";
import type {
  ConfigurationLifecycleState,
  RuntimeConfiguration,
} from "./configuration/runtimeConfigurationContract";
import type {
  CanonicalDisplayDensity,
  DensityLifecycleState,
  PresentationDensityModel,
} from "./density/runtimeDisplayDensityContract";
import type {
  BusinessReadiness,
  ConnectivityState,
  MaintenanceState,
  OperationalScreenState,
  OperationalState,
  ScreenStateError,
  ScreenStateWarning,
} from "./state/operationalScreenStateContract";
import type { RuntimeCapabilityContract, CapabilityId, CapabilityAdapter } from "./capability/runtimeCapabilityContract";
import type { RuntimeCapabilityNegotiator } from "./capability/runtimeCapabilityNegotiator";
import type { FrozenRuntimeInstanceContext } from "./runtimeInstanceContext";

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
  /** RUNTIME-INSTANCE-CONTEXT-1 — immutable bootstrap snapshot. */
  instance: FrozenRuntimeInstanceContext;
  identity: {
    deviceId: string;
    displayName: string;
    role: OperationalDeviceRole;
    restaurantId: number;
    branchId: number | null;
  };
  /** Normalized configuration — sole authority for runtime config consumption. */
  runtimeConfiguration: RuntimeConfiguration;
  configurationState: ConfigurationLifecycleState;
  configurationVersion: string;
  lastAppliedVersion: string | null;
  /** @deprecated Use runtimeConfiguration — retained for diagnostics migration only. */
  configuration: OperationalScreenConfig;
  /** @deprecated Use configurationVersion */
  configVersion: string;
  runtimeStatus: RuntimeGetStatusResponse["health"];
  /** Active presentation values (language/direction). */
  presentation: {
    language: ScreenLanguage;
    direction: DisplayDirection;
  };
  /** KITCHEN-DISPLAY-DENSITY-1 — resolved density from runtime manager. */
  displayDensity: CanonicalDisplayDensity;
  densityState: DensityLifecycleState;
  densityVersion: number;
  resolvedDensityModel: PresentationDensityModel;
  capabilities: RuntimeCapabilitySet;
  fingerprint: OperationalScreenRuntimeFingerprint;
  bootstrap: {
    bootedAt: string;
    bootstrapId: string;
    phase: BootstrapPhase;
  };
  /** SCREEN-STATE-MODEL-1 — canonical screen state authority. */
  screenState: OperationalScreenState;
  operationalState: OperationalState;
  connectivityState: ConnectivityState;
  businessReadiness: BusinessReadiness;
  maintenanceState: MaintenanceState;
  warnings: ScreenStateWarning[];
  errors: ScreenStateError[];
  /** RUNTIME-CAPABILITY-NEGOTIATION-1 — negotiated capability contract. */
  runtimeCapabilities: RuntimeCapabilityContract;
  capabilityNegotiator: RuntimeCapabilityNegotiator;
  resolveCapability: (capabilityId: CapabilityId) => CapabilityAdapter | null;
};
