/**
 * THERMAL-PRINTING-9A.3 — read-only execution capability matrix.
 */
import type {
  ExecutionPlatform,
  PlatformExecutionCapabilities,
} from "../../shared/printing/executionCapabilities";
import { PLATFORM_EXECUTION_PROFILES } from "./platformProfiles";

export type ExecutionCapabilityMatrix = Readonly<
  Record<ExecutionPlatform, PlatformExecutionCapabilities>
>;

const EXECUTION_CAPABILITY_MATRIX: ExecutionCapabilityMatrix = Object.freeze({
  ...PLATFORM_EXECUTION_PROFILES,
});

export function getExecutionCapabilityMatrix(): ExecutionCapabilityMatrix {
  return EXECUTION_CAPABILITY_MATRIX;
}

export function getPlatformExecutionCapabilities(
  platform: ExecutionPlatform
): PlatformExecutionCapabilities {
  return EXECUTION_CAPABILITY_MATRIX[platform];
}
