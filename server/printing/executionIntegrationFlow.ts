/**
 * THERMAL-PRINTING-9D — runtime execution integration (context → strategy, no I/O).
 */
import {
  freezeRuntimeExecutionPlanSummary,
  type RuntimeExecutionPlanSummary,
} from "../../shared/printing/executionIntegration";
import type { ExecutionContext } from "../../shared/printing/executionContext";
import type { ExecutionStrategyResult } from "../../shared/printing/executionStrategy";
import { getAgent } from "./agentRegistry";
import { buildExecutionContext } from "./executionContextBuilder";
import { resolveExecutionStrategyFromContext } from "./executionContextQueries";
import { getPrinterResolution } from "./resolutionQueries";

export type ResolveRuntimeExecutionPlanInput = {
  agentId: string;
  dbPrinterId: number;
};

export type ResolveRuntimeExecutionPlanResult = {
  summary: RuntimeExecutionPlanSummary;
  context?: ExecutionContext;
  strategy?: ExecutionStrategyResult;
};

function resolveAgentPlatform(agentId: string): RuntimeExecutionPlanSummary["platform"] {
  return getAgent(agentId)?.registration.identity.platform ?? "windows";
}

export function resolveRuntimeExecutionPlan(
  input: ResolveRuntimeExecutionPlanInput
): ResolveRuntimeExecutionPlanResult {
  const platform = resolveAgentPlatform(input.agentId);
  const resolution = getPrinterResolution(input.dbPrinterId);

  if (!resolution) {
    return {
      summary: freezeRuntimeExecutionPlanSummary({
        platform,
        contextBuilt: false,
        strategyResolved: false,
        message: "Printer not resolved",
      }),
    };
  }

  const built = buildExecutionContext({
    agentId: input.agentId,
    printerId: resolution.profilePrinterId,
  });

  if (!built.built) {
    return {
      summary: freezeRuntimeExecutionPlanSummary({
        platform,
        contextBuilt: false,
        strategyResolved: false,
        message: built.reason,
      }),
    };
  }

  const strategy = resolveExecutionStrategyFromContext(built.context);

  if (!strategy.resolved) {
    return {
      summary: freezeRuntimeExecutionPlanSummary({
        platform: built.context.platform.identity,
        contextBuilt: true,
        strategyResolved: false,
        strategyReason: strategy.reason,
        message: strategy.message,
      }),
      context: built.context,
      strategy,
    };
  }

  return {
    summary: freezeRuntimeExecutionPlanSummary({
      platform: built.context.platform.identity,
      contextBuilt: true,
      strategyResolved: true,
      method: strategy.method,
      strategyReason: strategy.reason,
    }),
    context: built.context,
    strategy,
  };
}
