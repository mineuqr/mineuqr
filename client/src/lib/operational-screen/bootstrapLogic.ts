import { TRPCClientError } from "@trpc/client";
import type { OperationalScreenConfig } from "../../../../server/operational-device/domain/screenConfig";
import type { OperationalScreenCredentials } from "./credentialStore";
import { RuntimeConfigurationManager } from "./configuration/runtimeConfigurationManager";
import type { RuntimeConfiguration } from "./configuration/runtimeConfigurationContract";
import { getRoleCapabilities } from "./runtimeCapabilities";
import { collectRuntimeFingerprint } from "./runtimeFingerprint";
import { runtimeContextFactory } from "./RuntimeContextFactory";
import type {
  BootstrapPhase,
  OperationalScreenRuntimeContext,
  RuntimeGetStatusResponse,
} from "./runtimeTypes";

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_RETRY_MIN_MS = 5_000;
export const HEARTBEAT_RETRY_MAX_MS = 30_000;
export const STATUS_POLL_INTERVAL_MS = 60_000;
/** ORDER-LIFECYCLE-LATENCY-REMEDIATION-1 — Mode A observer fallback (was 10s). */
export const DATA_POLL_INTERVAL_MS = 3_000;
/** REALTIME-KITCHEN-ADOPTION-1 — recovery poll while kitchen realtime is live. */
export const DATA_POLL_REALTIME_RECOVERY_MS = 15_000;

export function isDeviceAuthError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  if (error.data?.code === "UNAUTHORIZED") return true;
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid_credentials") ||
    message.includes("token_revoked") ||
    message.includes("token_expired") ||
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

export function loadInitialConfiguration(
  status: RuntimeGetStatusResponse,
  configManager: RuntimeConfigurationManager
): RuntimeConfiguration {
  const capabilities = getRoleCapabilities(status.device.role);
  return configManager.loadFromStatus(status, capabilities);
}

/** @deprecated Use runtimeContextFactory.buildRuntimeContext — retained for compatibility. */
export function buildRuntimeContext(input: {
  status: RuntimeGetStatusResponse;
  credentials: OperationalScreenCredentials;
  bootstrapId: string;
  phase: BootstrapPhase;
  fingerprint?: ReturnType<typeof collectRuntimeFingerprint>;
  runtimeConfiguration: RuntimeConfiguration;
  lastAppliedVersion: string | null;
}): OperationalScreenRuntimeContext {
  const instance = runtimeContextFactory.resolve({
    credentials: input.credentials,
    status: input.status,
    bootstrapId: input.bootstrapId,
  });
  return runtimeContextFactory.buildRuntimeContext({
    instance,
    bootstrapId: input.bootstrapId,
    phase: input.phase,
    runtimeHealth: input.status.health,
    fingerprint: input.fingerprint,
    runtimeConfiguration: input.runtimeConfiguration,
    lastAppliedVersion: input.lastAppliedVersion,
  });
}

export function applyConfigurationReload(
  current: OperationalScreenRuntimeContext,
  status: RuntimeGetStatusResponse,
  configManager: RuntimeConfigurationManager,
  credentials: OperationalScreenCredentials
): OperationalScreenRuntimeContext {
  return runtimeContextFactory.applyConfigurationReload(
    current,
    status,
    credentials,
    configManager
  );
}

/** @deprecated Use applyConfigurationReload */
export function applyConfigHotReload(
  current: OperationalScreenRuntimeContext,
  status: RuntimeGetStatusResponse,
  configManager: RuntimeConfigurationManager,
  credentials?: OperationalScreenCredentials
): OperationalScreenRuntimeContext {
  if (!credentials) {
    throw new Error("applyConfigHotReload requires credentials after RUNTIME-INSTANCE-CONTEXT-1");
  }
  return applyConfigurationReload(current, status, configManager, credentials);
}
