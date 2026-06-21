/**
 * THERMAL-PRINTING-9A.5 — execution feasibility checks (informational only).
 */
import type {
  ExecutionMethod,
  ExecutionPlatform,
} from "../../shared/printing/executionCapabilities";
import { getPlatformExecutionCapabilities } from "./executionCapabilityMatrix";

export type CanExecuteMethodInput = {
  platform: ExecutionPlatform;
  method: ExecutionMethod;
};

export function canExecuteMethod(input: CanExecuteMethodInput): boolean {
  const profile = getPlatformExecutionCapabilities(input.platform);
  return profile.methods.includes(input.method);
}
