import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import type { RuntimeConfiguration } from "../configuration/runtimeConfigurationContract";
import type { BootstrapPhase, OperationalScreenRuntimeContext } from "../runtimeTypes";

/** Formal runtime state — identical lifecycle surface for every role. */
export type RoleRuntimeStatus =
  | "initializing"
  | "authenticating"
  | "bootstrapping"
  | "ready"
  | "operational"
  | "blocked"
  | "disconnected"
  | "reconnecting"
  | "disposed";

/** Role-declared capabilities — consumed by diagnostics and future Screen Details. */
export type RoleCapabilityDeclaration = {
  supportsOrders: boolean;
  supportsTickets: boolean;
  supportsQueue: boolean;
  supportsReadyOrders: boolean;
  supportsDensity: boolean;
  supportsCategoryFilter: boolean;
  supportsTimeline: boolean;
  supportsAnimation: boolean;
  supportsPrintMonitor: boolean;
};

export type RoleMetadata = {
  role: OperationalDeviceRole;
  displayName: { en: string; ar: string };
  description: { en: string; ar: string };
  operational: boolean;
  capabilities: RoleCapabilityDeclaration;
  configurationSchemaVersion: string;
  futurePrograms: string[];
  blockedReason?: { en: string; ar: string };
};

export type RoleLifecycleContext = {
  context: OperationalScreenRuntimeContext;
  bootstrapPhase: BootstrapPhase;
  runtimeStatus: RoleRuntimeStatus;
  heartbeatCount: number;
  reconnectCount: number;
};

export type RoleLifecycleHandlers = {
  initialize(ctx: RoleLifecycleContext): void;
  mount(ctx: RoleLifecycleContext): void;
  activate(ctx: RoleLifecycleContext): void;
  deactivate(ctx: RoleLifecycleContext): void;
  dispose(ctx: RoleLifecycleContext): void;
  handleConfiguration(ctx: RoleLifecycleContext, configuration: RuntimeConfiguration): void;
  handleHeartbeat(ctx: RoleLifecycleContext): void;
  handleReconnect(ctx: RoleLifecycleContext): void;
};

export type RoleDiagnosticsContribution = Record<string, unknown>;

export type RuntimeRoleDefinition = {
  metadata: RoleMetadata;
  lifecycle: RoleLifecycleHandlers;
  resolveRuntimeStatus(
    bootstrapPhase: BootstrapPhase,
    context: OperationalScreenRuntimeContext,
    reconnecting: boolean
  ): RoleRuntimeStatus;
  collectDiagnostics(ctx: RoleLifecycleContext): RoleDiagnosticsContribution;
  presentationKey: "kitchen" | "blocked";
};

export type RoleRuntimeHealth = {
  runtimeState: RoleRuntimeStatus;
  role: OperationalDeviceRole;
  version: string;
  configurationVersion: string;
  appliedVersion: string | null;
  configurationState: RuntimeConfiguration["configurationState"];
  configurationErrors: string[];
  configurationUsedFallback: boolean;
  categoryFilterEnabled: boolean;
  categoryFilterVersion: number | null;
  capabilities: RoleCapabilityDeclaration;
  operational: boolean;
  blockedReason: { en: string; ar: string } | null;
  heartbeatCount: number;
  reconnectCount: number;
};
