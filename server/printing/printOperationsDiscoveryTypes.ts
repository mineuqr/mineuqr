/**
 * THERMAL-PRINTING-13I.1H / 13I.3A — printer discovery and ownership diagnostics (read-only).
 */

import type { RuntimeBindingStatus } from "../../shared/printing/printerBinding";
import type { PrinterProvisioningState } from "./printOperationsProvisioningTypes";

export type { ProvisioningStep, PrinterProvisioningState } from "./printOperationsProvisioningTypes";

export type PrinterInventoryEmptyReason =
  | "no_db_printers"
  | "no_agent_connected"
  | "agent_no_matching_profiles"
  | "ownership_conflict"
  | "printers_inactive";

export type DiscoveryAgentItem = {
  agentId: string;
  status: "offline" | "online" | "stale";
  inferredRestaurantId: number | null;
  reportedProfileCount: number;
  profileIds: string[];
  relevantToRestaurant: boolean;
};

export type OwnershipConflictItem = {
  profileId: string;
  agentId: string;
  owningRestaurantId: number;
  currentRestaurantId: number;
  printerId: number | null;
  printerName: string | null;
};

export type PrinterBindingStatusItem = {
  printerId: number;
  profileId: string;
  logicalPrinterName: string;
  agentId: string | null;
  bindingStatus: RuntimeBindingStatus | "UNKNOWN";
  windowsPrinterName: string | null;
  portName: string | null;
  lastValidatedAt: string | null;
  message: string | null;
};

export type PrintDiscoveryDiagnostics = {
  restaurantId: number;
  /** @legacy Support only — use getPrintingSetupStatus for readiness (PRINTING-ADR-13I-002). */
  isInventoryEmpty: boolean;
  /** @legacy Support only — do not drive operator UX. */
  emptyReason: PrinterInventoryEmptyReason | null;
  counts: {
    connectedAgentsGlobal: number;
    connectedAgentsForRestaurant: number;
    connectedEndpoints: number;
    discoveredPrinterProfiles: number;
    assignedDbPrinters: number;
    /** @legacy Connectivity metric — not printing readiness. */
    activePrinters: number;
  };
  agents: DiscoveryAgentItem[];
  ownershipConflicts: OwnershipConflictItem[];
  /** @legacy provisioning.step is not authoritative for readiness. */
  provisioning: PrinterProvisioningState;
  /** @legacy Raw binding data — authority aggregates via setup engine. */
  bindingStatus: PrinterBindingStatusItem[];
};

export type DiagnosticRunView = {
  diagnosticId: string;
  printerId: number;
  agentId: string | null;
  status: string;
  error: string | null;
  triggeredByLabel: string;
  createdAt: string;
  completedAt: string | null;
};
