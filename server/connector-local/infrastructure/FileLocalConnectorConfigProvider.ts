import { arch, platform } from "node:os";
import { readFileSync, existsSync } from "node:fs";
import type { LocalConnectorConfig } from "../contracts/LocalConnectorConfig";
import type { LocalConnectorConfigProvider } from "../contracts/LocalConnectorConfig";
import { resolveConnectorConfigPath } from "./connectorConfigPaths";
import { enrollmentToConfig, type StoredConnectorEnrollment } from "./connectorEnrollmentStore";
import { MINEUQR_CONNECTOR_VERSION } from "./productIdentity";

function readInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readFileEnrollment(): StoredConnectorEnrollment | null {
  const path = resolveConnectorConfigPath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as StoredConnectorEnrollment;
    if (!parsed.credentialSecret || !parsed.connectorId || !parsed.restaurantId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Loads connector config from persisted enrollment first, then env vars (backward compatible).
 */
export class FileLocalConnectorConfigProvider implements LocalConnectorConfigProvider {
  load(): LocalConnectorConfig {
    const version = process.env.RLC_VERSION?.trim() || MINEUQR_CONNECTOR_VERSION;
    const fileEnrollment = readFileEnrollment();
    if (fileEnrollment) {
      return enrollmentToConfig(fileEnrollment, version);
    }

    const restaurantId = readInt(process.env.RLC_RESTAURANT_ID, 0);
    const connectorId = process.env.RLC_CONNECTOR_ID?.trim();
    const credentialSecret = process.env.RLC_CREDENTIAL_SECRET?.trim();
    if (!connectorId || !credentialSecret || restaurantId <= 0) {
      throw new Error("connector_not_enrolled");
    }

    return {
      cloudEndpoint:
        process.env.RLC_CLOUD_ENDPOINT?.trim() || defaultCloudEndpointFromApiBase(),
      restaurantId,
      connectorId,
      credentialSecret,
      runtimeId: process.env.RLC_RUNTIME_ID?.trim() || `runtime-${platform()}-${arch()}`,
      deploymentType: "local_desktop",
      platform: platform(),
      architecture: arch(),
      connectorVersion: version,
      hostLabel: process.env.RLC_HOST_LABEL?.trim() || platform(),
      hostFingerprint: process.env.RLC_HOST_FINGERPRINT?.trim() || null,
      heartbeatIntervalMs: readInt(process.env.RLC_HEARTBEAT_INTERVAL_MS, 15_000),
    };
  }
}

export function defaultCloudEndpointFromApiBase(): string {
  const apiBase = process.env.RLC_API_BASE_URL?.trim() || process.env.MINEUQR_API_URL?.trim();
  if (apiBase) {
    const url = new URL(apiBase);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/connector/ws";
    url.search = "";
    url.hash = "";
    return url.toString();
  }
  return "ws://127.0.0.1:3000/connector/ws";
}

export function isConnectorEnrolled(): boolean {
  if (readFileEnrollment()) return true;
  return Boolean(
    process.env.RLC_CONNECTOR_ID?.trim() &&
      process.env.RLC_CREDENTIAL_SECRET?.trim() &&
      readInt(process.env.RLC_RESTAURANT_ID, 0) > 0
  );
}
