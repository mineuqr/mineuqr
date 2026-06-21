/**
 * THERMAL-PRINTING-9D — runtime execution integration contracts.
 */
import type { ExecutionMethod, ExecutionPlatform } from "./executionCapabilities";
import type { ExecutionStrategyReason } from "./executionStrategy";

export type RuntimeExecutionPlanSummary = {
  platform: ExecutionPlatform;
  contextBuilt: boolean;
  strategyResolved: boolean;
  method?: ExecutionMethod;
  strategyReason?: ExecutionStrategyReason | "unsupported-scenario" | "capability-rejected";
  message?: string;
};

export function freezeRuntimeExecutionPlanSummary(
  summary: RuntimeExecutionPlanSummary
): RuntimeExecutionPlanSummary {
  return Object.freeze(summary);
}
