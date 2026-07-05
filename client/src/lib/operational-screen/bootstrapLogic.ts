import { TRPCClientError } from "@trpc/client";
import type { OperationalScreenConfig } from "../../../../server/operational-device/domain/screenConfig";
import { DEFAULT_SCREEN_CONFIG } from "../../../../server/operational-device/domain/screenConfig";
import type { OperationalScreenCredentials } from "./credentialStore";
import { buildRuntimeCapabilitySet } from "./runtimeCapabilities";
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

export function buildRuntimeContext(input: {
  status: RuntimeGetStatusResponse;
  credentials: OperationalScreenCredentials;
  bootstrapId: string;
  phase: BootstrapPhase;
  fingerprint?: ReturnType<typeof collectRuntimeFingerprint>;
}): OperationalScreenRuntimeContext {
  const screenConfig: OperationalScreenConfig = input.status.screenConfig ?? {
    ...DEFAULT_SCREEN_CONFIG,
  };
  const fingerprint = input.fingerprint ?? collectRuntimeFingerprint(input.bootstrapId);

  return {
    identity: {
      deviceId: input.status.device.deviceId,
      displayName: input.status.device.displayName,
      role: input.status.device.role,
      restaurantId: input.status.device.restaurantId,
      branchId: input.status.device.branchId,
    },
    configuration: screenConfig,
    configVersion: input.status.configVersion,
    runtimeStatus: input.status.health,
    presentation: {
      language: screenConfig.language,
      direction: screenConfig.displayDirection,
      density: screenConfig.displayDensity,
    },
    capabilities: buildRuntimeCapabilitySet(input.status.device.role),
    fingerprint,
    bootstrap: {
      bootedAt: new Date().toISOString(),
      bootstrapId: input.bootstrapId,
      phase: input.phase,
    },
  };
}

export function applyConfigHotReload(
  current: OperationalScreenRuntimeContext,
  status: RuntimeGetStatusResponse
): OperationalScreenRuntimeContext {
  const screenConfig = status.screenConfig ?? current.configuration;
  return {
    ...current,
    identity: {
      ...current.identity,
      displayName: status.device.displayName,
    },
    configuration: screenConfig,
    configVersion: status.configVersion,
    runtimeStatus: status.health,
    presentation: {
      language: screenConfig.language,
      direction: screenConfig.displayDirection,
      density: screenConfig.displayDensity,
    },
  };
}
