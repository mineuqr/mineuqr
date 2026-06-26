/**
 * PRINTING-ADR-13I-002 — Printing Readiness Authority contract.
 *
 * The only fields that may drive operator-facing printing readiness UX:
 * - setupState
 * - operationalState
 * - severity
 * - nextAction
 * - reason
 * - checklist
 * - printers (per-printer setup states)
 * - agent
 *
 * Source: printOps.getPrintingSetupStatus → resolvePrintingSetupState()
 */
export const PRINTING_READINESS_AUTHORITY_PROCEDURE = "printOps.getPrintingSetupStatus" as const;

export const PRINTING_READINESS_CONTRACT_FIELDS = [
  "setupState",
  "operationalState",
  "severity",
  "nextAction",
  "reason",
  "checklist",
  "printers",
  "agent",
] as const;

export type PrintingReadinessContractField = (typeof PRINTING_READINESS_CONTRACT_FIELDS)[number];

/**
 * Fields that must never determine operator readiness (support / legacy only).
 */
export const PRINTING_READINESS_LEGACY_FIELDS = [
  "provisioning.step",
  "emptyReason",
  "isInventoryEmpty",
  "counts.activePrinters",
  "connectConfig.physicalBindings",
] as const;

export const PRINTING_READINESS_SUPPORT_FIELDS = [
  "counts.connectedAgentsForRestaurant",
  "counts.connectedAgentsGlobal",
  "counts.connectedEndpoints",
  "counts.discoveredPrinterProfiles",
  "counts.assignedDbPrinters",
  "bindingStatus[]",
  "ownershipConflicts[]",
  "agents[]",
  "provisioning.connectConfig",
  "provisioning.suggestedAgentId",
  "provisioning.primaryPrinterId",
] as const;

/**
 * Authoritative inputs consumed only by the Setup State Engine (not UI directly).
 */
export const PRINTING_READINESS_AUTHORITATIVE_INPUTS = [
  "printers (database)",
  "agent lifecycle",
  "binding reports",
  "ownership conflicts",
  "diagnostic runs",
  "printer resolution",
] as const;
