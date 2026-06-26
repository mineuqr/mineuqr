/**
 * THERMAL-PRINTING-13I.3B — Printing Setup State Engine.
 *
 * Authoritative operational setup state per PRINTING-ADR-13I-002.
 * Does not derive readiness from provisioning.step, activePrinters, or connectConfig.
 */
import type { SelectPrintDiagnosticRun } from "../../../drizzle/schema";
import { listPrintDiagnosticRunsForRestaurant } from "../diagnosticPrintRepository";
import { getPrintDiscoveryDiagnostics } from "../printOperationsDiscoveryService";
import type { DiscoveryAgentItem, PrinterBindingStatusItem } from "../printOperationsDiscoveryTypes";
import {
  computeConfigurationRevision,
  findLatestCompletedDiagnosticForPrinter,
  isDiagnosticValidForConfiguration,
} from "./configurationRevision";
import {
  buildRestaurantBindingStatus,
  detectOwnershipConflicts,
  getAgentLastSeenAt,
  listRelevantAgents,
  loadSetupRestaurantPrinters,
  resolvePrimaryPrinter,
  selectPreferredAgent,
  type SetupRestaurantPrinter,
} from "./discoveryInputs";
import {
  buildConfigurationRevisionFactor,
  isBindingIncomplete,
  isBindingInvalid,
  resolvePrinterSetupState,
} from "./resolvePrinterSetupState";
import type {
  PrintingOperationalState,
  PrintingSetupState,
  PrintingSetupStatus,
  SetupNextAction,
  SetupSeverity,
} from "./types";

const DIAGNOSTIC_HISTORY_LIMIT = 50;

function resolveSetupNextAction(input: {
  setupState: PrintingSetupState;
  operationalState: PrintingOperationalState;
  preferredAgent: DiscoveryAgentItem | null;
  hasRegisteredRelevantAgent: boolean;
}): SetupNextAction {
  if (input.operationalState === "BLOCKED") {
    return "RESOLVE_CONFLICT";
  }

  switch (input.setupState) {
    case "NO_PRINTERS":
      return "CREATE_PRINTER";
    case "AWAITING_AGENT":
      if (!input.hasRegisteredRelevantAgent) {
        return "INSTALL_AGENT";
      }
      return "CONNECT_AGENT";
    case "AGENT_CONNECTED":
    case "BINDING_REQUIRED":
      return "BIND_PRINTER";
    case "BINDING_INVALID":
      return "FIX_BINDING";
    case "READY_FOR_TEST":
      return "RUN_TEST_PRINT";
    case "READY":
      return "NONE";
    default:
      return input.preferredAgent?.status === "online" ? "BIND_PRINTER" : "CONNECT_AGENT";
  }
}

function resolveSetupSeverity(input: {
  setupState: PrintingSetupState;
  operationalState: PrintingOperationalState;
}): SetupSeverity {
  if (input.operationalState === "BLOCKED" || input.setupState === "BINDING_INVALID") {
    return "error";
  }
  if (
    input.operationalState === "DEGRADED" ||
    input.setupState === "AWAITING_AGENT" ||
    input.setupState === "BINDING_REQUIRED"
  ) {
    return "warning";
  }
  return "info";
}

function resolveSetupReason(input: {
  setupState: PrintingSetupState;
  operationalState: PrintingOperationalState;
  ownershipConflictCount: number;
  diagnosticValid: boolean;
}): string {
  if (input.operationalState === "BLOCKED") {
    return "Printer profile ownership conflict must be resolved before setup can continue.";
  }
  if (input.operationalState === "DEGRADED") {
    return "Printing was ready but the agent or binding is no longer healthy.";
  }

  switch (input.setupState) {
    case "NO_PRINTERS":
      return "Create a printer to begin printing setup.";
    case "AWAITING_AGENT":
      return "Install and connect the print agent on the POS.";
    case "AGENT_CONNECTED":
      return "Agent is connected. Complete printer binding on the POS.";
    case "BINDING_REQUIRED":
      return "Bind each logical printer to a Windows printer on the POS.";
    case "BINDING_INVALID":
      return "A bound Windows printer is missing or invalid on the POS.";
    case "READY_FOR_TEST":
      return input.diagnosticValid
        ? "Run a test print to confirm printing is ready."
        : "Configuration changed since the last successful test print. Run a new test print.";
    case "READY":
      return "Printing setup is complete and ready for production.";
    default:
      return "Printing setup is in progress.";
  }
}

function hasRelevantOnlineAgent(agents: DiscoveryAgentItem[]): boolean {
  return agents.some((agent) => agent.relevantToRestaurant && agent.status === "online");
}

function hasRegisteredRelevantAgent(agents: DiscoveryAgentItem[]): boolean {
  return agents.some((agent) => agent.relevantToRestaurant);
}

function isAwaitingInitialBindingReport(bindingStatuses: PrinterBindingStatusItem[]): boolean {
  return (
    bindingStatuses.length > 0 &&
    bindingStatuses.every(
      (item) =>
        item.bindingStatus === "UNKNOWN" &&
        item.lastValidatedAt == null &&
        (item.message?.includes("not reported") ?? false)
    )
  );
}

function deriveRawSetupState(input: {
  printers: SetupRestaurantPrinter[];
  ownershipConflictCount: number;
  relevantOnlineAgent: boolean;
  bindingStatuses: PrinterBindingStatusItem[];
  allBound: boolean;
  diagnosticValid: boolean;
}): PrintingSetupState {
  if (input.printers.length === 0) {
    return "NO_PRINTERS";
  }

  if (input.allBound && input.diagnosticValid) {
    return "READY";
  }

  if (input.allBound && !input.diagnosticValid) {
    return "READY_FOR_TEST";
  }

  if (!input.relevantOnlineAgent) {
    return "AWAITING_AGENT";
  }

  const hasInvalidBinding = input.bindingStatuses.some((item) => isBindingInvalid(item.bindingStatus));
  if (hasInvalidBinding) {
    return "BINDING_INVALID";
  }

  if (isAwaitingInitialBindingReport(input.bindingStatuses)) {
    return "AGENT_CONNECTED";
  }

  const hasIncompleteBinding = input.bindingStatuses.some((item) =>
    isBindingIncomplete(item.bindingStatus)
  );
  if (hasIncompleteBinding) {
    return "BINDING_REQUIRED";
  }

  return "AGENT_CONNECTED";
}

function deriveOperationalState(input: {
  ownershipConflictCount: number;
  setupState: PrintingSetupState;
  relevantOnlineAgent: boolean;
  allBound: boolean;
}): PrintingOperationalState {
  if (input.ownershipConflictCount > 0) {
    return "BLOCKED";
  }

  if (input.setupState === "READY") {
    if (!input.relevantOnlineAgent || !input.allBound) {
      return "DEGRADED";
    }
    return "HEALTHY";
  }

  return "HEALTHY";
}

function coerceImpossibleSetupState(input: {
  setupState: PrintingSetupState;
  printers: SetupRestaurantPrinter[];
  allBound: boolean;
  diagnosticValid: boolean;
  relevantOnlineAgent: boolean;
}): PrintingSetupState {
  let setupState = input.setupState;

  if (input.printers.length === 0) {
    return "NO_PRINTERS";
  }

  if (setupState === "READY" && !input.allBound) {
    setupState = "BINDING_REQUIRED";
  }
  if (setupState === "READY" && !input.diagnosticValid) {
    setupState = "READY_FOR_TEST";
  }
  if (setupState === "READY_FOR_TEST" && !input.allBound) {
    setupState = "BINDING_REQUIRED";
  }
  if (
    (setupState === "BINDING_REQUIRED" || setupState === "BINDING_INVALID") &&
    !input.relevantOnlineAgent &&
    !input.allBound
  ) {
    setupState = "AWAITING_AGENT";
  }

  return setupState;
}

function buildChecklist(input: {
  printers: SetupRestaurantPrinter[];
  relevantOnlineAgent: boolean;
  allBound: boolean;
  diagnosticValid: boolean;
}) {
  return {
    printerCreated: input.printers.length > 0,
    agentConnected: input.relevantOnlineAgent,
    printerBound: input.allBound,
    testPrintPassed: input.diagnosticValid,
  };
}

export async function resolvePrintingSetupState(
  restaurantId: number,
  options?: { includeSupport?: boolean }
): Promise<PrintingSetupStatus> {
  const evaluatedAt = new Date().toISOString();
  const printers = await loadSetupRestaurantPrinters(restaurantId);
  const restaurantProfileIds = new Set(
    printers.map((printer) => printer.profileId.trim()).filter((profileId) => profileId.length > 0)
  );
  const agents = listRelevantAgents(restaurantId, restaurantProfileIds);
  const ownershipConflicts = detectOwnershipConflicts(restaurantId, printers);
  const bindingStatuses = buildRestaurantBindingStatus(printers);
  const primaryPrinter = resolvePrimaryPrinter(printers);
  const preferredAgent = selectPreferredAgent(agents);

  const revisionFactors = printers.map((printer, index) =>
    buildConfigurationRevisionFactor({
      printer,
      binding: bindingStatuses[index]!,
    })
  );
  const configurationRevision = computeConfigurationRevision(revisionFactors);

  const diagnostics = await listPrintDiagnosticRunsForRestaurant({
    restaurantId,
    limit: DIAGNOSTIC_HISTORY_LIMIT,
  });

  const latestCompletedPrimary = primaryPrinter
    ? findLatestCompletedDiagnosticForPrinter({
        diagnostics,
        printerId: primaryPrinter.id,
      })
    : null;

  const primaryAssignedAgentId =
    bindingStatuses.find((item) => item.printerId === primaryPrinter?.id)?.agentId ?? null;

  const diagnosticValid = isDiagnosticValidForConfiguration({
    diagnostic: latestCompletedPrimary,
    primaryPrinterId: primaryPrinter?.id ?? null,
    configurationRevision,
    currentAssignedAgentId: primaryAssignedAgentId,
  });

  const allBound =
    bindingStatuses.length > 0 &&
    bindingStatuses.every((item) => item.bindingStatus === "BOUND");
  const relevantOnlineAgent = hasRelevantOnlineAgent(agents);

  let setupState = deriveRawSetupState({
    printers,
    ownershipConflictCount: ownershipConflicts.length,
    relevantOnlineAgent,
    bindingStatuses,
    allBound,
    diagnosticValid,
  });

  setupState = coerceImpossibleSetupState({
    setupState,
    printers,
    allBound,
    diagnosticValid,
    relevantOnlineAgent,
  });

  const operationalState = deriveOperationalState({
    ownershipConflictCount: ownershipConflicts.length,
    setupState,
    relevantOnlineAgent,
    allBound,
  });

  const printerStates = printers.map((printer, index) => {
    const binding = bindingStatuses[index]!;
    const resolved = resolvePrinterSetupState({
      binding,
      configurationRevision,
      diagnostics,
      primaryPrinterId: primaryPrinter?.id ?? null,
    });

    return {
      printerId: printer.id,
      name: printer.name,
      profileId: printer.profileId,
      setupState: resolved.setupState,
      bindingStatus: resolved.bindingStatus,
      agentId: resolved.agentId,
      agentStatus: resolved.agentStatus,
      lastValidatedAt: resolved.lastValidatedAt,
      lastDiagnosticStatus: resolved.lastDiagnosticStatus,
      lastDiagnosticAt: resolved.lastDiagnosticAt,
    };
  });

  const checklist = buildChecklist({
    printers,
    relevantOnlineAgent,
    allBound,
    diagnosticValid,
  });

  const severity = resolveSetupSeverity({ setupState, operationalState });
  const nextAction = resolveSetupNextAction({
    setupState,
    operationalState,
    preferredAgent,
    hasRegisteredRelevantAgent: hasRegisteredRelevantAgent(agents),
  });
  const reason = resolveSetupReason({
    setupState,
    operationalState,
    ownershipConflictCount: ownershipConflicts.length,
    diagnosticValid,
  });

  const status: PrintingSetupStatus = {
    restaurantId,
    evaluatedAt,
    setupState,
    operationalState,
    severity,
    nextAction,
    reason,
    checklist,
    primaryPrinter: primaryPrinter
      ? {
          printerId: primaryPrinter.id,
          name: primaryPrinter.name,
          profileId: primaryPrinter.profileId,
        }
      : null,
    printers: printerStates,
    agent: {
      agentId: preferredAgent?.agentId ?? null,
      status: preferredAgent?.status ?? null,
      lastSeenAt: getAgentLastSeenAt(preferredAgent?.agentId ?? null),
    },
    configurationRevision,
    diagnosticValidation: {
      primaryPrinterId: primaryPrinter?.id ?? null,
      latestCompletedDiagnosticId: latestCompletedPrimary?.diagnosticId ?? null,
      latestCompletedAt: latestCompletedPrimary?.completedAt ?? null,
      validForCurrentConfiguration: diagnosticValid,
    },
  };

  if (options?.includeSupport) {
    const discovery = await getPrintDiscoveryDiagnostics(restaurantId);
    status.support = {
      ownershipConflicts,
      legacyProvisioningStep: discovery.provisioning.step,
      discoveryCounts: discovery.counts,
      bindingStatus: discovery.bindingStatus,
      agents: discovery.agents,
    };
  }

  return status;
}
