import { TRPCClientError } from "@trpc/client";
import type { OperationalScreenConfig } from "../../../../server/operational-device/domain/screenConfig";
import { DEFAULT_SCREEN_CONFIG } from "../../../../server/operational-device/domain/screenConfig";
import type { OperationalScreenCredentials } from "./credentialStore";
import { RuntimeConfigurationManager } from "./configuration/runtimeConfigurationManager";
import type { RuntimeConfiguration } from "./configuration/runtimeConfigurationContract";
import { buildRuntimeCapabilitySet, getRoleCapabilities } from "./runtimeCapabilities";
import { COMFORTABLE_DENSITY_MODEL } from "./density/presentationDensityModels";
import {
  negotiateRuntimeCapabilities,
} from "./capability/negotiateRuntimeCapabilities";
import { runtimeCapabilityNegotiator } from "./capability/runtimeCapabilityNegotiator";
import { createInitialScreenState } from "./state/initialScreenState";
import { collectRuntimeFingerprint } from "./runtimeFingerprint";
import type {
  BootstrapPhase,
  OperationalScreenRuntimeContext,
  RuntimeGetStatusResponse,
} from "./runtimeTypes";

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_RETRY_MIN_MS = 5_000;
export const HEARTBEAT_RETRY_MAX_MS = 30_000;
export const STATUS_POLL_INTERVAL_MS = 60_000;
export const DATA_POLL_INTERVAL_MS = 10_000;

export function isDeviceAuthError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  if (error.data?.code === "UNAUTHORIZED") return true;
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid_credentials") ||
    message.includes("token_revoked") ||
    message.includes("device_disabled") ||
    message.includes("valid operational device credentials")
  );
}

export function createBootstrapId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `boot_${Date.now()}`;
}

function rawConfigFromRuntime(runtimeConfiguration: RuntimeConfiguration): OperationalScreenConfig {
  return {
    language: runtimeConfiguration.active.language,
    displayDirection: runtimeConfiguration.active.direction,
    displayDensity: runtimeConfiguration.tracked.density,
    visibleCategoryIds: runtimeConfiguration.tracked.categoryIds,
  };
}

export function buildRuntimeContext(input: {
  status: RuntimeGetStatusResponse;
  credentials: OperationalScreenCredentials;
  bootstrapId: string;
  phase: BootstrapPhase;
  fingerprint?: ReturnType<typeof collectRuntimeFingerprint>;
  runtimeConfiguration: RuntimeConfiguration;
  lastAppliedVersion: string | null;
}): OperationalScreenRuntimeContext {
  const fingerprint = input.fingerprint ?? collectRuntimeFingerprint(input.bootstrapId);
  const { runtimeConfiguration } = input;
  const initialScreenState = createInitialScreenState();
  const capabilities = buildRuntimeCapabilitySet(input.status.device.role);
  const runtimeCapabilities = negotiateRuntimeCapabilities(
    input.status.device.role,
    capabilities.server
  );

  return {
    identity: {
      deviceId: input.status.device.deviceId,
      displayName: input.status.device.displayName,
      role: input.status.device.role,
      restaurantId: input.status.device.restaurantId,
      branchId: input.status.device.branchId,
    },
    runtimeConfiguration,
    configurationState: runtimeConfiguration.configurationState,
    configurationVersion: runtimeConfiguration.version,
    lastAppliedVersion: input.lastAppliedVersion,
    configuration: rawConfigFromRuntime(runtimeConfiguration),
    configVersion: runtimeConfiguration.version,
    runtimeStatus: input.status.health,
    presentation: {
      language: runtimeConfiguration.active.language,
      direction: runtimeConfiguration.active.direction,
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
      bootedAt: new Date().toISOString(),
      bootstrapId: input.bootstrapId,
      phase: input.phase,
    },
  };
}

export function applyConfigurationReload(
  current: OperationalScreenRuntimeContext,
  status: RuntimeGetStatusResponse,
  configManager: RuntimeConfigurationManager
): OperationalScreenRuntimeContext {
  const capabilities = getRoleCapabilities(status.device.role);
  const reloaded = configManager.reloadFromStatus(status, capabilities);
  if (!reloaded) {
    return {
      ...current,
      runtimeStatus: status.health,
      identity: { ...current.identity, displayName: status.device.displayName },
    };
  }

  const snapshot = configManager.getSnapshot();
  return {
    ...current,
    identity: { ...current.identity, displayName: status.device.displayName },
    runtimeConfiguration: reloaded,
    configurationState: reloaded.configurationState,
    configurationVersion: reloaded.version,
    lastAppliedVersion: snapshot.lastAppliedVersion,
    configuration: rawConfigFromRuntime(reloaded),
    configVersion: reloaded.version,
    runtimeStatus: status.health,
    presentation: {
      language: reloaded.active.language,
      direction: reloaded.active.direction,
    },
  };
}

/** @deprecated Use applyConfigurationReload */
export function applyConfigHotReload(
  current: OperationalScreenRuntimeContext,
  status: RuntimeGetStatusResponse,
  configManager: RuntimeConfigurationManager
): OperationalScreenRuntimeContext {
  return applyConfigurationReload(current, status, configManager);
}

export function loadInitialConfiguration(
  status: RuntimeGetStatusResponse,
  configManager: RuntimeConfigurationManager
): RuntimeConfiguration {
  const capabilities = getRoleCapabilities(status.device.role);
  return configManager.loadFromStatus(status, capabilities);
}
