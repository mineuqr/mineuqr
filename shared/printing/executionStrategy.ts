/**
 * THERMAL-PRINTING-9B — execution strategy contracts (decision-only).
 */
import type { ExecutionMethod, ExecutionPlatform } from "./executionCapabilities";
import type { PrinterProfile, PrinterProfileTransport } from "./printerProfiles";

export type ExecutionStrategyMethod = ExecutionMethod;

export const EXECUTION_STRATEGY_REASONS = {
  PLATFORM_ESC_POS_DIRECT: "platform-escpos-direct",
  PLATFORM_SPOOLER_FALLBACK: "platform-spooler-fallback",
  IOS_AIRPRINT: "ios-airprint",
  IOS_VENDOR_SDK: "ios-vendor-sdk",
  IOS_BRIDGE_AGENT: "ios-bridge-agent",
  CAPABILITY_REJECTED: "capability-rejected",
  UNSUPPORTED_SCENARIO: "unsupported-scenario",
} as const;

export type ExecutionStrategyReason =
  (typeof EXECUTION_STRATEGY_REASONS)[keyof typeof EXECUTION_STRATEGY_REASONS];

export type ExecutionStrategyPrinterCharacteristics = {
  escposCapable: boolean;
  airprintCapable: boolean;
  vendorSdkCapable: boolean;
  transport?: PrinterProfileTransport;
};

export type ExecutionStrategySuccess = {
  resolved: true;
  method: ExecutionMethod;
  reason: ExecutionStrategyReason;
};

export type ExecutionStrategyFailure = {
  resolved: false;
  reason: ExecutionStrategyReason;
  message: string;
};

export type ExecutionStrategyResult = ExecutionStrategySuccess | ExecutionStrategyFailure;

export type ResolveExecutionStrategyInput = {
  platform: ExecutionPlatform;
  printer: ExecutionStrategyPrinterCharacteristics;
};

export function buildExecutionStrategyPrinterCharacteristics(
  profile: PrinterProfile,
  options: {
    airprintCapable?: boolean;
    vendorSdkCapable?: boolean;
  } = {}
): ExecutionStrategyPrinterCharacteristics {
  return {
    escposCapable: profile.capabilities.escpos,
    airprintCapable: options.airprintCapable ?? false,
    vendorSdkCapable: options.vendorSdkCapable ?? false,
    transport: profile.transport,
  };
}

export function freezeExecutionStrategyResult(
  result: ExecutionStrategyResult
): ExecutionStrategyResult {
  return Object.freeze(result);
}
