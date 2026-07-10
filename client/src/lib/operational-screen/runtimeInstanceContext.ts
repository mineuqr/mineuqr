import type { OperationalDeviceRole } from "../../../../server/operational-device/domain/deviceRoles";
import type { OperationalScreenConfig } from "../../../../server/operational-device/domain/screenConfig";
import type { RoleCapabilityDeclaration } from "./roles/runtimeRoleContract";
import type { CapabilityId } from "./capability/runtimeCapabilityContract";

/** RUNTIME-INSTANCE-CONTEXT-1 — immutable runtime instance schema version. */
export const RUNTIME_INSTANCE_CONTEXT_SCHEMA_VERSION = 1 as const;

export type RuntimeInstanceIdentity = {
  /** Unique per bootstrap — correlates diagnostics and fingerprint. */
  instanceId: string;
  /** Tenant business scope (restaurant). */
  businessId: string;
  /** Staff-facing screen label from device record. */
  displayIdentity: string;
  deviceId: string;
};

export type RuntimeInstanceScreen = {
  /** Device record is the screen instance in current architecture. */
  screenId: string;
  screenType: OperationalDeviceRole;
  displayName: string;
  location: string | null;
  zone: string | null;
  status: "active" | "disabled";
};

export type RuntimeInstanceRole = {
  role: OperationalDeviceRole;
  permissions: {
    canAccessKitchenQueue: boolean;
    canAccessPrintMonitor: boolean;
    canExecuteOrderActions: boolean;
    declared: RoleCapabilityDeclaration;
  };
  visibility: {
    operational: boolean;
    blockedReason: { en: string; ar: string } | null;
  };
};

export type RuntimeInstanceBusiness = {
  businessName: string | null;
  tenantId: number;
  branchId: number | null;
  timezone: string | null;
  currency: string | null;
  language: OperationalScreenConfig["language"];
};

export type RuntimeInstanceDevice = {
  deviceModel: string;
  platform: string;
  runtimeVersion: string;
  pairingState: "paired" | "unpaired";
};

export type RuntimeInstanceConfiguration = {
  configRevision: string;
  settings: OperationalScreenConfig;
  features: RoleCapabilityDeclaration;
  theme: {
    language: OperationalScreenConfig["language"];
    direction: OperationalScreenConfig["displayDirection"];
    density: OperationalScreenConfig["displayDensity"];
  };
};

export type RuntimeInstanceCapabilities = {
  supportedActions: string[];
  supportedEvents: string[];
  supportedViews: string[];
  supportedPrinting: boolean;
  negotiatedFeatures: CapabilityId[];
};

export type RuntimeInstanceSession = {
  sessionId: string;
  issuedAt: string;
  expiresAt: string | null;
  lastHeartbeat: string | null;
};

export type RuntimeInstanceMetadata = {
  schemaVersion: typeof RUNTIME_INSTANCE_CONTEXT_SCHEMA_VERSION;
  runtimeVersion: string;
  createdAt: string;
};

/** Complete operational runtime identity snapshot — resolved once at bootstrap. */
export type RuntimeInstanceContext = {
  identity: RuntimeInstanceIdentity;
  screen: RuntimeInstanceScreen;
  role: RuntimeInstanceRole;
  business: RuntimeInstanceBusiness;
  device: RuntimeInstanceDevice;
  configuration: RuntimeInstanceConfiguration;
  capabilities: RuntimeInstanceCapabilities;
  session: RuntimeInstanceSession;
  metadata: RuntimeInstanceMetadata;
};

export type FrozenRuntimeInstanceContext = Readonly<RuntimeInstanceContext>;

export class RuntimeContextValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RuntimeContextValidationError";
    this.code = code;
  }
}

function freezeSection<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

/** Deep-freezes the instance snapshot for lifecycle immutability. */
export function freezeRuntimeInstanceContext(
  context: RuntimeInstanceContext
): FrozenRuntimeInstanceContext {
  return Object.freeze({
    identity: freezeSection({ ...context.identity }),
    screen: freezeSection({ ...context.screen }),
    role: freezeSection({
      ...context.role,
      permissions: freezeSection({ ...context.role.permissions }),
      visibility: freezeSection({ ...context.role.visibility }),
    }),
    business: freezeSection({ ...context.business }),
    device: freezeSection({ ...context.device }),
    configuration: freezeSection({
      ...context.configuration,
      settings: freezeSection({ ...context.configuration.settings }),
      features: freezeSection({ ...context.configuration.features }),
      theme: freezeSection({ ...context.configuration.theme }),
    }),
    capabilities: freezeSection({
      ...context.capabilities,
      supportedActions: Object.freeze([...context.capabilities.supportedActions]),
      supportedEvents: Object.freeze([...context.capabilities.supportedEvents]),
      supportedViews: Object.freeze([...context.capabilities.supportedViews]),
      negotiatedFeatures: Object.freeze([...context.capabilities.negotiatedFeatures]),
    }),
    session: freezeSection({ ...context.session }),
    metadata: freezeSection({ ...context.metadata }),
  });
}
