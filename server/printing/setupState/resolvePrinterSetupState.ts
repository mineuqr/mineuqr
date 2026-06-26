/**
 * THERMAL-PRINTING-13I.3B — per-printer setup state resolution.
 */
import type { SelectPrintDiagnosticRun } from "../../../drizzle/schema";
import type { RuntimeBindingStatus } from "../../../shared/printing/printerBinding";
import {
  findLatestCompletedDiagnosticForPrinter,
  isDiagnosticValidForConfiguration,
  mapDiagnosticStatus,
} from "./configurationRevision";
import { getAgentStatusForPrinter } from "./discoveryInputs";
import type {
  PrinterSetupState,
  PrintingConfigurationRevision,
  PrintingConfigurationRevisionFactor,
} from "./types";
import type { PrinterBindingStatusItem } from "../printOperationsDiscoveryTypes";

export function buildConfigurationRevisionFactor(input: {
  printer: {
    id: number;
    name: string;
    profileId: string;
    paperWidthMm: number;
    isDefault: boolean;
    updatedAt: string;
  };
  binding: PrinterBindingStatusItem;
}): PrintingConfigurationRevisionFactor {
  return {
    printerId: input.printer.id,
    profileId: input.printer.profileId.trim(),
    name: input.printer.name,
    paperWidthMm: input.printer.paperWidthMm,
    isDefault: input.printer.isDefault,
    assignedAgentId: input.binding.agentId,
    bindingStatus: input.binding.bindingStatus,
    windowsPrinterName: input.binding.windowsPrinterName,
    portName: input.binding.portName,
    bindingValidatedAt: input.binding.lastValidatedAt,
    printerUpdatedAt: input.printer.updatedAt,
  };
}

export function resolvePrinterSetupState(input: {
  binding: PrinterBindingStatusItem;
  configurationRevision: PrintingConfigurationRevision;
  diagnostics: SelectPrintDiagnosticRun[];
  primaryPrinterId: number | null;
}): {
  setupState: PrinterSetupState;
  bindingStatus: RuntimeBindingStatus | "UNKNOWN";
  agentId: string | null;
  agentStatus: "offline" | "online" | "stale" | null;
  lastValidatedAt: string | null;
  lastDiagnosticStatus: ReturnType<typeof mapDiagnosticStatus>;
  lastDiagnosticAt: string | null;
} {
  const agentId = input.binding.agentId;
  const agentStatus = getAgentStatusForPrinter(agentId);
  const latestDiagnostic =
    input.diagnostics.find((row) => row.printerId === input.binding.printerId) ?? null;
  const latestCompleted = findLatestCompletedDiagnosticForPrinter({
    diagnostics: input.diagnostics,
    printerId: input.binding.printerId,
  });
  const diagnosticValid = isDiagnosticValidForConfiguration({
    diagnostic: latestCompleted,
    primaryPrinterId: input.primaryPrinterId,
    configurationRevision: input.configurationRevision,
    currentAssignedAgentId: agentId,
  });

  let setupState: PrinterSetupState;

  if (!agentId) {
    setupState = "UNRESOLVED";
  } else if (agentStatus !== "online") {
    setupState = "AGENT_OFFLINE";
  } else if (input.binding.bindingStatus === "UNKNOWN") {
    setupState = "BINDING_UNKNOWN";
  } else if (input.binding.bindingStatus === "UNBOUND") {
    setupState = "BINDING_REQUIRED";
  } else if (
    input.binding.bindingStatus === "MISSING_PRINTER" ||
    input.binding.bindingStatus === "INVALID_BINDING"
  ) {
    setupState = "BINDING_INVALID";
  } else if (input.binding.bindingStatus === "BOUND") {
    if (latestDiagnostic?.status === "failed") {
      setupState = "TEST_FAILED";
    } else if (diagnosticValid) {
      setupState = "TEST_PASSED";
    } else {
      setupState = "BOUND";
    }
  } else {
    setupState = "BINDING_UNKNOWN";
  }

  return {
    setupState,
    bindingStatus: input.binding.bindingStatus,
    agentId,
    agentStatus,
    lastValidatedAt: input.binding.lastValidatedAt,
    lastDiagnosticStatus: latestDiagnostic ? mapDiagnosticStatus(latestDiagnostic.status) : null,
    lastDiagnosticAt: latestDiagnostic?.completedAt ?? latestDiagnostic?.createdAt ?? null,
  };
}

export function isBindingInvalid(bindingStatus: RuntimeBindingStatus | "UNKNOWN"): boolean {
  return bindingStatus === "MISSING_PRINTER" || bindingStatus === "INVALID_BINDING";
}

export function isBindingIncomplete(bindingStatus: RuntimeBindingStatus | "UNKNOWN"): boolean {
  return bindingStatus === "UNBOUND" || bindingStatus === "UNKNOWN";
}
