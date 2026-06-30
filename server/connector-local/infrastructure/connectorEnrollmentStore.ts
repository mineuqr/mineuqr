import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { LocalConnectorConfig } from "../contracts/LocalConnectorConfig";
import { resolveConnectorConfigPath } from "./connectorConfigPaths";

export type StoredConnectorEnrollment = {
  cloudEndpoint: string;
  restaurantId: number;
  connectorId: string;
  credentialSecret: string;
  hostLabel?: string | null;
  hostFingerprint?: string | null;
  enrolledAt: string;
};

export async function readStoredEnrollment(): Promise<StoredConnectorEnrollment | null> {
  try {
    const raw = await readFile(resolveConnectorConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as StoredConnectorEnrollment;
    if (!parsed.credentialSecret || !parsed.connectorId || !parsed.restaurantId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredEnrollment(
  enrollment: Omit<StoredConnectorEnrollment, "enrolledAt"> & { enrolledAt?: string }
): Promise<void> {
  const path = resolveConnectorConfigPath();
  await mkdir(dirname(path), { recursive: true });
  const payload: StoredConnectorEnrollment = {
    ...enrollment,
    enrolledAt: enrollment.enrolledAt ?? new Date().toISOString(),
  };
  await writeFile(path, JSON.stringify(payload, null, 2), "utf8");
}

export function enrollmentToConfig(
  enrollment: StoredConnectorEnrollment,
  connectorVersion: string
): LocalConnectorConfig {
  return {
    cloudEndpoint: enrollment.cloudEndpoint,
    restaurantId: enrollment.restaurantId,
    connectorId: enrollment.connectorId,
    credentialSecret: enrollment.credentialSecret,
    runtimeId: `runtime-${enrollment.connectorId}`,
    deploymentType: "local_desktop",
    platform: process.platform,
    architecture: process.arch,
    connectorVersion,
    hostLabel: enrollment.hostLabel?.trim() || "Restaurant computer",
    hostFingerprint: enrollment.hostFingerprint ?? null,
    heartbeatIntervalMs: 15_000,
  };
}
