/**
 * THERMAL-PRINTING-9C — execution context contracts (read-only operational model).
 */
import type { AgentPlatform } from "./agentTypes";
import type {
  ExecutionMethod,
  ExecutionPlatform,
  ExecutionTransport,
} from "./executionCapabilities";
import type {
  ExecutionStrategyPrinterCharacteristics,
  ResolveExecutionStrategyInput,
} from "./executionStrategy";
import type {
  PrinterProfilePaperWidth,
  PrinterProfileTransport,
} from "./printerProfiles";

export type ExecutionContextPlatform = {
  identity: ExecutionPlatform;
};

export type ExecutionContextCapabilities = {
  supportedMethods: ExecutionMethod[];
  supportedTransports: ExecutionTransport[];
  supportsEscPos: boolean;
  supportsLocalExecution: boolean;
};

export type ExecutionContextAvailability = {
  availableTransports: ExecutionTransport[];
  hasPlatformCapabilityReport: boolean;
  printerTransportAvailable: boolean;
};

export type ExecutionContextPrinter = {
  printerId: string;
  printerName: string;
  transport: PrinterProfileTransport;
  escposCapable: boolean;
  airprintCapable: boolean;
  vendorSdkCapable: boolean;
  vendorSdkId?: string;
  paperWidth: PrinterProfilePaperWidth;
};

export type ExecutionContextAgent = {
  agentId: string;
  platform: AgentPlatform;
  protocolVersion: string;
  connectedAt: string;
  platformConsistent: boolean;
};

export type ExecutionContext = {
  platform: ExecutionContextPlatform;
  capabilities: ExecutionContextCapabilities;
  availability: ExecutionContextAvailability;
  printer: ExecutionContextPrinter;
  agent: ExecutionContextAgent;
};

export type BuildExecutionContextInput = {
  agentId: string;
  printerId: string;
};

export type BuildExecutionContextSuccess = {
  built: true;
  context: ExecutionContext;
};

export type BuildExecutionContextFailure = {
  built: false;
  reason: string;
};

export type BuildExecutionContextResult =
  | BuildExecutionContextSuccess
  | BuildExecutionContextFailure;

export function deepFreezeExecutionContext<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreezeExecutionContext((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export function executionContextToStrategyInput(
  context: ExecutionContext
): ResolveExecutionStrategyInput {
  const printer: ExecutionStrategyPrinterCharacteristics = {
    escposCapable: context.printer.escposCapable,
    airprintCapable: context.printer.airprintCapable,
    vendorSdkCapable: context.printer.vendorSdkCapable,
    transport: context.printer.transport,
  };
  return {
    platform: context.platform.identity,
    printer,
  };
}
