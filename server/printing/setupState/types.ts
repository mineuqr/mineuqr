/**
 * THERMAL-PRINTING-13I.3B — Printing Setup State Engine types.
 */
import type { DiagnosticPrintStatus } from "../../../shared/printing/diagnosticPrint";
import type { RuntimeBindingStatus } from "../../../shared/printing/printerBinding";
import type {
  DiscoveryAgentItem,
  OwnershipConflictItem,
  PrintDiscoveryDiagnostics,
  PrinterBindingStatusItem,
} from "../printOperationsDiscoveryTypes";
import type { ProvisioningStep } from "../printOperationsProvisioningTypes";

export const PRINTING_SETUP_STATES = [
  "NO_PRINTERS",
  "AWAITING_AGENT",
  "AGENT_CONNECTED",
  "BINDING_REQUIRED",
  "BINDING_INVALID",
  "READY_FOR_TEST",
  "READY",
] as const;

export type PrintingSetupState = (typeof PRINTING_SETUP_STATES)[number];

export const PRINTING_OPERATIONAL_STATES = ["HEALTHY", "DEGRADED", "BLOCKED"] as const;

export type PrintingOperationalState = (typeof PRINTING_OPERATIONAL_STATES)[number];

export const SETUP_NEXT_ACTIONS = [
  "CREATE_PRINTER",
  "INSTALL_AGENT",
  "CONNECT_AGENT",
  "BIND_PRINTER",
  "RUN_TEST_PRINT",
  "FIX_BINDING",
  "RESOLVE_CONFLICT",
  "NONE",
] as const;

export type SetupNextAction = (typeof SETUP_NEXT_ACTIONS)[number];

export const SETUP_SEVERITIES = ["info", "warning", "error"] as const;

export type SetupSeverity = (typeof SETUP_SEVERITIES)[number];

export const PRINTER_SETUP_STATES = [
  "UNRESOLVED",
  "AGENT_OFFLINE",
  "BINDING_UNKNOWN",
  "BINDING_REQUIRED",
  "BINDING_INVALID",
  "BOUND",
  "TEST_PASSED",
  "TEST_FAILED",
] as const;

export type PrinterSetupState = (typeof PRINTER_SETUP_STATES)[number];

export type PrintingSetupChecklist = {
  printerCreated: boolean;
  agentConnected: boolean;
  printerBound: boolean;
  testPrintPassed: boolean;
};

export type PrintingSetupPrimaryPrinter = {
  printerId: number;
  name: string;
  profileId: string;
} | null;

export type PrintingSetupPrinterState = {
  printerId: number;
  name: string;
  profileId: string;
  setupState: PrinterSetupState;
  bindingStatus: RuntimeBindingStatus | "UNKNOWN";
  agentId: string | null;
  agentStatus: "offline" | "online" | "stale" | null;
  lastValidatedAt: string | null;
  lastDiagnosticStatus: DiagnosticPrintStatus | null;
  lastDiagnosticAt: string | null;
};

export type PrintingSetupAgentState = {
  agentId: string | null;
  status: "offline" | "online" | "stale" | null;
  lastSeenAt: string | null;
};

export type PrintingConfigurationRevision = {
  revision: string;
  invalidationEpoch: string;
  factors: PrintingConfigurationRevisionFactor[];
};

export type PrintingConfigurationRevisionFactor = {
  printerId: number;
  profileId: string;
  name: string;
  paperWidthMm: number;
  isDefault: boolean;
  assignedAgentId: string | null;
  bindingStatus: RuntimeBindingStatus | "UNKNOWN";
  windowsPrinterName: string | null;
  portName: string | null;
  bindingValidatedAt: string | null;
  printerUpdatedAt: string;
};

export type PrintingSetupSupportDetails = {
  ownershipConflicts: OwnershipConflictItem[];
  legacyProvisioningStep: ProvisioningStep;
  discoveryCounts: PrintDiscoveryDiagnostics["counts"];
  bindingStatus: PrinterBindingStatusItem[];
  agents: DiscoveryAgentItem[];
};

export type PrintingSetupStatus = {
  restaurantId: number;
  evaluatedAt: string;
  setupState: PrintingSetupState;
  operationalState: PrintingOperationalState;
  severity: SetupSeverity;
  nextAction: SetupNextAction;
  reason: string;
  checklist: PrintingSetupChecklist;
  primaryPrinter: PrintingSetupPrimaryPrinter;
  printers: PrintingSetupPrinterState[];
  agent: PrintingSetupAgentState;
  configurationRevision: PrintingConfigurationRevision;
  diagnosticValidation: {
    primaryPrinterId: number | null;
    latestCompletedDiagnosticId: string | null;
    latestCompletedAt: string | null;
    validForCurrentConfiguration: boolean;
  };
  support?: PrintingSetupSupportDetails;
};
