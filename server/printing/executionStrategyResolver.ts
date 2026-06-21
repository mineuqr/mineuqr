/**
 * THERMAL-PRINTING-9B — authoritative execution strategy resolver (decision-only).
 */
import type { ExecutionMethod, ExecutionPlatform } from "../../shared/printing/executionCapabilities";
import {
  EXECUTION_STRATEGY_REASONS,
  freezeExecutionStrategyResult,
  type ExecutionStrategyPrinterCharacteristics,
  type ExecutionStrategyReason,
  type ExecutionStrategyResult,
  type ResolveExecutionStrategyInput,
} from "../../shared/printing/executionStrategy";
import { canExecuteMethod } from "./executionFeasibilityService";

type StrategyCandidate = {
  method: ExecutionMethod;
  reason: ExecutionStrategyReason;
};

function selectWindowsStrategy(
  printer: ExecutionStrategyPrinterCharacteristics
): StrategyCandidate | null {
  if (printer.escposCapable) {
    return {
      method: "raw-escpos",
      reason: EXECUTION_STRATEGY_REASONS.PLATFORM_ESC_POS_DIRECT,
    };
  }

  return {
    method: "spooler",
    reason: EXECUTION_STRATEGY_REASONS.PLATFORM_SPOOLER_FALLBACK,
  };
}

function selectAndroidStrategy(
  printer: ExecutionStrategyPrinterCharacteristics
): StrategyCandidate | null {
  if (!printer.escposCapable) {
    return null;
  }

  return {
    method: "raw-escpos",
    reason: EXECUTION_STRATEGY_REASONS.PLATFORM_ESC_POS_DIRECT,
  };
}

function selectIosStrategy(
  printer: ExecutionStrategyPrinterCharacteristics
): StrategyCandidate | null {
  if (printer.airprintCapable) {
    return {
      method: "airprint",
      reason: EXECUTION_STRATEGY_REASONS.IOS_AIRPRINT,
    };
  }

  if (printer.vendorSdkCapable) {
    return {
      method: "vendor-sdk",
      reason: EXECUTION_STRATEGY_REASONS.IOS_VENDOR_SDK,
    };
  }

  if (printer.transport === "network" && printer.escposCapable) {
    return {
      method: "bridge-agent",
      reason: EXECUTION_STRATEGY_REASONS.IOS_BRIDGE_AGENT,
    };
  }

  return null;
}

function selectStrategyCandidate(
  platform: ExecutionPlatform,
  printer: ExecutionStrategyPrinterCharacteristics
): StrategyCandidate | null {
  switch (platform) {
    case "windows":
      return selectWindowsStrategy(printer);
    case "android":
      return selectAndroidStrategy(printer);
    case "ios":
      return selectIosStrategy(printer);
    default:
      return null;
  }
}

export function resolveExecutionStrategy(
  input: ResolveExecutionStrategyInput
): ExecutionStrategyResult {
  const candidate = selectStrategyCandidate(input.platform, input.printer);

  if (!candidate) {
    return freezeExecutionStrategyResult({
      resolved: false,
      reason: EXECUTION_STRATEGY_REASONS.UNSUPPORTED_SCENARIO,
      message: `No execution strategy for platform ${input.platform} and printer characteristics`,
    });
  }

  if (
    !canExecuteMethod({
      platform: input.platform,
      method: candidate.method,
    })
  ) {
    return freezeExecutionStrategyResult({
      resolved: false,
      reason: EXECUTION_STRATEGY_REASONS.CAPABILITY_REJECTED,
      message: `Platform ${input.platform} cannot execute method ${candidate.method}`,
    });
  }

  return freezeExecutionStrategyResult({
    resolved: true,
    method: candidate.method,
    reason: candidate.reason,
  });
}
