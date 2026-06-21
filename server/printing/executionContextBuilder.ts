/**
 * THERMAL-PRINTING-9C — read-only execution context builder.
 */
import type {
  BuildExecutionContextInput,
  BuildExecutionContextResult,
  ExecutionContext,
  ExecutionContextAgent,
  ExecutionContextAvailability,
  ExecutionContextCapabilities,
  ExecutionContextPlatform,
  ExecutionContextPrinter,
} from "../../shared/printing/executionContext";
import { deepFreezeExecutionContext } from "../../shared/printing/executionContext";
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";
import type { PlatformCapabilities } from "../../shared/printing/platformCapabilities";
import type { PrinterProfileTransport } from "../../shared/printing/printerProfiles";
import { getAgent } from "./agentRegistry";
import {
  getSupportedExecutionMethods,
  getSupportedTransports,
  supportsEscPos,
  supportsLocalExecution,
} from "./executionCapabilityQueries";
import { getPlatformConsistency } from "./platformConsistencyQueries";
import { getStoredAgentPlatformCapabilities } from "./platformCapabilityStore";
import { getPrinterProfile } from "./printerProfileQueries";

function printerTransportToExecutionTransport(
  transport: PrinterProfileTransport
): ExecutionTransport {
  return transport;
}

function normalizeAvailableTransports(
  report: PlatformCapabilities | undefined
): ExecutionTransport[] {
  if (!report) {
    return [];
  }

  const available: ExecutionTransport[] = [];
  if (report.transports.usb) available.push("usb");
  if (report.transports.bluetooth) available.push("bluetooth");
  if (report.transports.network) available.push("network");
  return available;
}

function buildCapabilities(platform: ExecutionContextPlatform["identity"]): ExecutionContextCapabilities {
  return {
    supportedMethods: getSupportedExecutionMethods(platform),
    supportedTransports: getSupportedTransports(platform),
    supportsEscPos: supportsEscPos(platform),
    supportsLocalExecution: supportsLocalExecution(platform),
  };
}

function buildAvailability(input: {
  platformReport: PlatformCapabilities | undefined;
  printerTransport: PrinterProfileTransport;
}): ExecutionContextAvailability {
  const availableTransports = normalizeAvailableTransports(input.platformReport);
  const printerExecutionTransport = printerTransportToExecutionTransport(
    input.printerTransport
  );

  return {
    availableTransports,
    hasPlatformCapabilityReport: input.platformReport !== undefined,
    printerTransportAvailable:
      input.platformReport !== undefined &&
      availableTransports.includes(printerExecutionTransport),
  };
}

function buildPrinter(
  profile: NonNullable<ReturnType<typeof getPrinterProfile>>
): ExecutionContextPrinter {
  return {
    printerId: profile.printerId,
    printerName: profile.printerName,
    transport: profile.transport,
    escposCapable: profile.capabilities.escpos,
    airprintCapable: profile.executionCapabilities.airprint,
    vendorSdkCapable: profile.executionCapabilities.vendorSdk,
    vendorSdkId: profile.executionCapabilities.vendorSdkId,
    paperWidth: profile.paperWidth,
  };
}

function buildAgent(agentId: string): ExecutionContextAgent | undefined {
  const agent = getAgent(agentId);
  if (!agent) {
    return undefined;
  }

  const consistency = getPlatformConsistency(agentId);

  return {
    agentId: agent.registration.identity.agentId,
    platform: agent.registration.identity.platform,
    protocolVersion: agent.registration.identity.protocolVersion,
    connectedAt: agent.registration.connectedAt,
    platformConsistent: consistency?.consistent ?? false,
  };
}

export function buildExecutionContext(
  input: BuildExecutionContextInput
): BuildExecutionContextResult {
  const agent = buildAgent(input.agentId.trim());
  if (!agent) {
    return { built: false, reason: "Agent not registered" };
  }

  const profile = getPrinterProfile(input.agentId, input.printerId);
  if (!profile) {
    return { built: false, reason: "Printer profile not found" };
  }

  const platformReport = getStoredAgentPlatformCapabilities(input.agentId)?.capabilities;
  const platform: ExecutionContextPlatform = {
    identity: agent.platform,
  };

  const context: ExecutionContext = deepFreezeExecutionContext({
    platform,
    capabilities: buildCapabilities(platform.identity),
    availability: buildAvailability({
      platformReport,
      printerTransport: profile.transport,
    }),
    printer: buildPrinter(profile),
    agent,
  });

  return { built: true, context };
}
