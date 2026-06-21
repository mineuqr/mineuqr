/**
 * THERMAL-PRINTING-9A.4 / 9A.6 — read-only execution capability queries.
 */
import type {
  ExecutionMethod,
  ExecutionPlatform,
  ExecutionTransport,
} from "../../shared/printing/executionCapabilities";
import {
  getExecutionCapabilityMatrix,
  getPlatformExecutionCapabilities,
} from "./executionCapabilityMatrix";

export type ExecutionPlatformSummary = {
  platform: ExecutionPlatform;
  transportCount: number;
  methodCount: number;
  supportsEscPos: boolean;
  supportsLocalExecution: boolean;
};

export function getSupportedTransports(
  platform: ExecutionPlatform
): ExecutionTransport[] {
  return [...getPlatformExecutionCapabilities(platform).transports];
}

export function getSupportedExecutionMethods(
  platform: ExecutionPlatform
): ExecutionMethod[] {
  return [...getPlatformExecutionCapabilities(platform).methods];
}

export function supportsEscPos(platform: ExecutionPlatform): boolean {
  return getPlatformExecutionCapabilities(platform).supportsEscPos;
}

export function supportsLocalExecution(platform: ExecutionPlatform): boolean {
  return getPlatformExecutionCapabilities(platform).supportsLocalExecution;
}

export function getExecutionPlatformSummary(
  platform?: ExecutionPlatform
): ExecutionPlatformSummary | ExecutionPlatformSummary[] {
  if (platform) {
    return summarizePlatform(getPlatformExecutionCapabilities(platform));
  }

  return (Object.keys(getExecutionCapabilityMatrix()) as ExecutionPlatform[]).map(
    (entry) => summarizePlatform(getPlatformExecutionCapabilities(entry))
  );
}

function summarizePlatform(
  profile: ReturnType<typeof getPlatformExecutionCapabilities>
): ExecutionPlatformSummary {
  return {
    platform: profile.platform,
    transportCount: profile.transports.length,
    methodCount: profile.methods.length,
    supportsEscPos: profile.supportsEscPos,
    supportsLocalExecution: profile.supportsLocalExecution,
  };
}
