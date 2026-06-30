import { arch, platform } from "node:os";
import type { LocalConnectorConfig } from "../contracts/LocalConnectorConfig";
import type { LocalConnectorConfigProvider } from "../contracts/LocalConnectorConfig";

function readInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readRequired(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`missing_required_config:${name}`);
  }
  return trimmed;
}

/**
 * Environment-based runtime configuration (no business configuration).
 */
export class EnvLocalConnectorConfigProvider implements LocalConnectorConfigProvider {
  load(): LocalConnectorConfig {
    return {
      cloudEndpoint: process.env.RLC_CLOUD_ENDPOINT?.trim() || "wss://cloud.mineuqr.local/connector",
      restaurantId: readInt(process.env.RLC_RESTAURANT_ID, 0),
      connectorId: readRequired("RLC_CONNECTOR_ID", process.env.RLC_CONNECTOR_ID),
      credentialSecret: readRequired("RLC_CREDENTIAL_SECRET", process.env.RLC_CREDENTIAL_SECRET),
      runtimeId: process.env.RLC_RUNTIME_ID?.trim() || `runtime-${platform()}-${arch()}`,
      deploymentType: "local_desktop",
      platform: platform(),
      architecture: arch(),
      connectorVersion: process.env.RLC_VERSION?.trim() || "1.0.0",
      hostLabel: process.env.RLC_HOST_LABEL?.trim() || platform(),
      hostFingerprint: process.env.RLC_HOST_FINGERPRINT?.trim() || null,
      heartbeatIntervalMs: readInt(process.env.RLC_HEARTBEAT_INTERVAL_MS, 15_000),
    };
  }
}

export function createTestLocalConnectorConfig(
  overrides: Partial<LocalConnectorConfig> = {}
): LocalConnectorConfig {
  return {
    cloudEndpoint: "in-process://test",
    restaurantId: 1,
    connectorId: "rlc-test-1",
    credentialSecret: "test-secret",
    runtimeId: "runtime-test",
    deploymentType: "local_desktop",
    platform: "win32",
    architecture: "x64",
    connectorVersion: "1.0.0",
    hostLabel: "kitchen-pc",
    hostFingerprint: "fp-test",
    heartbeatIntervalMs: 1_000,
    ...overrides,
  };
}
