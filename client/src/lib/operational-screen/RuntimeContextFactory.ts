import {
  rolePermitsKitchenQueue,
  rolePermitsPrintMonitor,
} from "../../../../server/operational-device/domain/deviceRoles";
import { rolePermitsOrderExecution } from "../../../../server/operational-device/domain/deviceOrderExecution";
import type { OperationalScreenCredentials } from "./credentialStore";
import { RuntimeConfigurationManager } from "./configuration/runtimeConfigurationManager";
import type { RuntimeConfiguration } from "./configuration/runtimeConfigurationContract";
import { COMFORTABLE_DENSITY_MODEL } from "./density/presentationDensityModels";
import {
  negotiateRuntimeCapabilities,
} from "./capability/negotiateRuntimeCapabilities";
import { runtimeCapabilityNegotiator } from "./capability/runtimeCapabilityNegotiator";
import { createInitialScreenState } from "./state/initialScreenState";
import { collectRuntimeFingerprint } from "./runtimeFingerprint";
import { buildRuntimeCapabilitySet, getRoleCapabilities } from "./runtimeCapabilities";
import "./roles/registerRoles";
import { resolveRuntimeRole } from "./roles/runtimeRoleRegistry";
import { loadInitialConfiguration } from "./bootstrapLogic";
import type {
  BootstrapPhase,
  OperationalScreenRuntimeContext,
  RuntimeGetStatusResponse,
} from "./runtimeTypes";
import type { CapabilityId } from "./capability/runtimeCapabilityContract";
import {
  freezeRuntimeInstanceContext,
  RUNTIME_INSTANCE_CONTEXT_SCHEMA_VERSION,
  RuntimeContextValidationError,
  type FrozenRuntimeInstanceContext,
  type RuntimeInstanceContext,
} from "./runtimeInstanceContext";

const RUNTIME_LIFECYCLE_EVENTS = [
  "CREDENTIALS_FOUND",
  "STATUS_RECEIVED",
  "CONTEXT_ASSEMBLED",
  "HEARTBEAT_STARTED",
  "NETWORK_FAILURE",
  "NETWORK_RECOVERED",
  "AUTH_REVOKED",
  "RUN_BLOCKED",
] as const;

function resolveRuntimeVersion(): string {
  return import.meta.env.VITE_APP_VERSION ?? "web";
}

function resolveDeviceModel(): string {
  if (typeof navigator === "undefined") return "web";
  return navigator.userAgent.slice(0, 128) || "web";
}

function resolvePlatform(): string {
  if (typeof navigator === "undefined") return "web";
  return navigator.platform || "web";
}

function deriveSupportedViews(role: ReturnType<typeof resolveRuntimeRole>): string[] {
  return [role.presentationKey];
}

function deriveSupportedActions(role: RuntimeGetStatusResponse["device"]["role"]): string[] {
  const definition = resolveRuntimeRole(role);
  const actions: string[] = [];
  if (rolePermitsOrderExecution(role)) {
    actions.push("execute-order-action");
  }
  if (definition.metadata.capabilities.supportsPrintMonitor) {
    actions.push("view-print-monitor");
  }
  if (definition.metadata.capabilities.supportsTickets) {
    actions.push("view-kitchen-queue");
  }
  return actions;
}

function deriveNegotiatedFeatures(
  role: RuntimeGetStatusResponse["device"]["role"],
  serverCapabilities: ReturnType<typeof buildRuntimeCapabilitySet>["server"]
): CapabilityId[] {
  const contract = negotiateRuntimeCapabilities(role, serverCapabilities);
  return contract.supportedFeatures;
}

export type RuntimeContextResolveInput = {
  credentials: OperationalScreenCredentials;
  status: RuntimeGetStatusResponse;
  bootstrapId: string;
  lastHeartbeat?: string | null;
};

export type RuntimeContextBuildInput = {
  instance: FrozenRuntimeInstanceContext;
  bootstrapId: string;
  phase: BootstrapPhase;
  runtimeHealth: RuntimeGetStatusResponse["health"];
  fingerprint?: ReturnType<typeof collectRuntimeFingerprint>;
  runtimeConfiguration: RuntimeConfiguration;
  lastAppliedVersion: string | null;
};

/**
 * RUNTIME-INSTANCE-CONTEXT-1 — sole authority for resolving operational runtime context.
 * No other runtime service may assemble identity, screen, role, business, or device slices.
 */
export class RuntimeContextFactory {
  resolve(input: RuntimeContextResolveInput): FrozenRuntimeInstanceContext {
    const assembled = this.assemble(input);
    this.validate(assembled, input.credentials, input.status);
    return freezeRuntimeInstanceContext(assembled);
  }

  /** Atomic replace path for future refresh / invalidation flows. */
  refresh(
    input: RuntimeContextResolveInput,
    previous: FrozenRuntimeInstanceContext | null
  ): FrozenRuntimeInstanceContext {
    const next = this.resolve({
      ...input,
      lastHeartbeat: input.lastHeartbeat ?? previous?.session.lastHeartbeat ?? null,
    });
    return next;
  }

  loadConfiguration(
    status: RuntimeGetStatusResponse,
    configManager: RuntimeConfigurationManager
  ): RuntimeConfiguration {
    return loadInitialConfiguration(status, configManager);
  }

  buildRuntimeContext(input: RuntimeContextBuildInput): OperationalScreenRuntimeContext {
    const fingerprint = input.fingerprint ?? collectRuntimeFingerprint(input.bootstrapId);
    const { instance, runtimeConfiguration } = input;
    const initialScreenState = createInitialScreenState();
    const capabilities = buildRuntimeCapabilitySet(instance.role.role);
    const runtimeCapabilities = negotiateRuntimeCapabilities(
      instance.role.role,
      capabilities.server
    );

    return {
      instance,
      identity: {
        deviceId: instance.identity.deviceId,
        displayName: instance.identity.displayIdentity,
        role: instance.role.role,
        restaurantId: instance.business.tenantId,
        branchId: instance.business.branchId,
      },
      runtimeConfiguration,
      configurationState: runtimeConfiguration.configurationState,
      configurationVersion: runtimeConfiguration.version,
      lastAppliedVersion: input.lastAppliedVersion,
      configuration: instance.configuration.settings,
      configVersion: instance.configuration.configRevision,
      runtimeStatus: input.runtimeHealth,
      presentation: {
        language: instance.configuration.theme.language,
        direction: instance.configuration.theme.direction,
      },
      displayDensity: "comfortable",
      densityState: "loading",
      densityVersion: 0,
      resolvedDensityModel: COMFORTABLE_DENSITY_MODEL,
      screenState: initialScreenState,
      operationalState: initialScreenState.operationalState,
      connectivityState: initialScreenState.connectivityState,
      businessReadiness: initialScreenState.businessReadiness,
      maintenanceState: initialScreenState.maintenanceState,
      warnings: initialScreenState.warnings,
      errors: initialScreenState.errors,
      capabilities,
      runtimeCapabilities,
      capabilityNegotiator: runtimeCapabilityNegotiator,
      resolveCapability: (capabilityId) =>
        runtimeCapabilityNegotiator.resolve(capabilityId, runtimeCapabilities),
      fingerprint,
      bootstrap: {
        bootedAt: instance.metadata.createdAt,
        bootstrapId: input.bootstrapId,
        phase: input.phase,
      },
    };
  }

  applyConfigurationReload(
    current: OperationalScreenRuntimeContext,
    status: RuntimeGetStatusResponse,
    credentials: OperationalScreenCredentials,
    configManager: RuntimeConfigurationManager
  ): OperationalScreenRuntimeContext {
    const refreshedInstance = this.refresh(
      {
        credentials,
        status,
        bootstrapId: current.bootstrap.bootstrapId,
        lastHeartbeat: current.instance.session.lastHeartbeat,
      },
      current.instance
    );

    const capabilities = getRoleCapabilities(status.device.role);
    const reloaded = configManager.reloadFromStatus(status, capabilities);
    if (!reloaded) {
      return {
        ...current,
        instance: refreshedInstance,
        runtimeStatus: status.health,
        identity: {
          ...current.identity,
          displayName: refreshedInstance.identity.displayIdentity,
        },
      };
    }

    const snapshot = configManager.getSnapshot();
    return {
      ...current,
      instance: refreshedInstance,
      identity: {
        ...current.identity,
        displayName: refreshedInstance.identity.displayIdentity,
      },
      runtimeConfiguration: reloaded,
      configurationState: reloaded.configurationState,
      configurationVersion: reloaded.version,
      lastAppliedVersion: snapshot.lastAppliedVersion,
      configuration: refreshedInstance.configuration.settings,
      configVersion: refreshedInstance.configuration.configRevision,
      runtimeStatus: status.health,
      presentation: {
        language: reloaded.active.language,
        direction: reloaded.active.direction,
      },
    };
  }

  withHeartbeat(
    instance: FrozenRuntimeInstanceContext,
    heartbeatAt: string
  ): FrozenRuntimeInstanceContext {
    return freezeRuntimeInstanceContext({
      ...instance,
      session: {
        ...instance.session,
        lastHeartbeat: heartbeatAt,
      },
    });
  }

  validate(
    context: RuntimeInstanceContext,
    credentials: OperationalScreenCredentials,
    status: RuntimeGetStatusResponse
  ): void {
    if (!context.identity.instanceId.trim()) {
      throw new RuntimeContextValidationError("missing_instance_id", "instanceId is required");
    }
    if (!context.identity.deviceId.trim()) {
      throw new RuntimeContextValidationError("missing_device_id", "deviceId is required");
    }
    if (context.identity.deviceId !== credentials.deviceId) {
      throw new RuntimeContextValidationError(
        "device_id_mismatch",
        "Resolved deviceId does not match stored credentials"
      );
    }
    if (context.identity.deviceId !== status.device.deviceId) {
      throw new RuntimeContextValidationError(
        "status_device_mismatch",
        "Resolved deviceId does not match getStatus payload"
      );
    }
    if (!Number.isInteger(context.business.tenantId) || context.business.tenantId <= 0) {
      throw new RuntimeContextValidationError("invalid_tenant", "tenantId must be a positive integer");
    }
    if (status.device.status === "disabled") {
      throw new RuntimeContextValidationError("device_disabled", "Device is disabled");
    }
    if (!status.health.hasActiveToken) {
      throw new RuntimeContextValidationError("token_inactive", "Device has no active token");
    }
    try {
      resolveRuntimeRole(context.role.role);
    } catch {
      throw new RuntimeContextValidationError(
        "role_unregistered",
        `Role is not registered: ${context.role.role}`
      );
    }
  }

  private assemble(input: RuntimeContextResolveInput): RuntimeInstanceContext {
    const { credentials, status, bootstrapId } = input;
    const roleDefinition = resolveRuntimeRole(status.device.role);
    const roleCapabilities = roleDefinition.metadata.capabilities;
    const capabilitySet = buildRuntimeCapabilitySet(status.device.role);
    const createdAt = new Date().toISOString();

    return {
      identity: {
        instanceId: bootstrapId,
        businessId: String(status.device.restaurantId),
        displayIdentity: status.device.displayName,
        deviceId: status.device.deviceId,
      },
      screen: {
        screenId: status.device.deviceId,
        screenType: status.device.role,
        displayName: status.device.displayName,
        location: status.device.branchId != null ? String(status.device.branchId) : null,
        zone: null,
        status: status.device.status,
      },
      role: {
        role: status.device.role,
        permissions: {
          canAccessKitchenQueue: rolePermitsKitchenQueue(status.device.role),
          canAccessPrintMonitor: rolePermitsPrintMonitor(status.device.role),
          canExecuteOrderActions: rolePermitsOrderExecution(status.device.role),
          declared: roleCapabilities,
        },
        visibility: {
          operational: roleDefinition.metadata.operational,
          blockedReason: roleDefinition.metadata.blockedReason ?? null,
        },
      },
      business: {
        businessName: null,
        tenantId: status.device.restaurantId,
        branchId: status.device.branchId,
        timezone: null,
        currency: null,
        language: status.screenConfig.language,
      },
      device: {
        deviceModel: resolveDeviceModel(),
        platform: resolvePlatform(),
        runtimeVersion: resolveRuntimeVersion(),
        pairingState: "paired",
      },
      configuration: {
        configRevision: status.configVersion,
        settings: status.screenConfig,
        features: roleCapabilities,
        theme: {
          language: status.screenConfig.language,
          direction: status.screenConfig.displayDirection,
          density: status.screenConfig.displayDensity,
        },
      },
      capabilities: {
        supportedActions: deriveSupportedActions(status.device.role),
        supportedEvents: [...RUNTIME_LIFECYCLE_EVENTS],
        supportedViews: deriveSupportedViews(roleDefinition),
        supportedPrinting: rolePermitsPrintMonitor(status.device.role),
        negotiatedFeatures: deriveNegotiatedFeatures(status.device.role, capabilitySet.server),
      },
      session: {
        sessionId: credentials.tokenId,
        issuedAt: credentials.pairedAt,
        expiresAt: null,
        lastHeartbeat: input.lastHeartbeat ?? null,
      },
      metadata: {
        schemaVersion: RUNTIME_INSTANCE_CONTEXT_SCHEMA_VERSION,
        runtimeVersion: resolveRuntimeVersion(),
        createdAt,
      },
    };
  }
}

/** Shared factory — sole resolver for RuntimeInstanceContext. */
export const runtimeContextFactory = new RuntimeContextFactory();
