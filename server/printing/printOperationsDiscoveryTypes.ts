/**
 * THERMAL-PRINTING-13I.1H — printer discovery and ownership diagnostics (read-only).
 */

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

export type PrintDiscoveryDiagnostics = {
  restaurantId: number;
  isInventoryEmpty: boolean;
  emptyReason: PrinterInventoryEmptyReason | null;
  counts: {
    connectedAgentsGlobal: number;
    connectedAgentsForRestaurant: number;
    connectedEndpoints: number;
    discoveredPrinterProfiles: number;
    assignedDbPrinters: number;
    activePrinters: number;
  };
  agents: DiscoveryAgentItem[];
  ownershipConflicts: OwnershipConflictItem[];
  provisioning: PrinterProvisioningState;
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
