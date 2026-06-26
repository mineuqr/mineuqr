/**
 * PRINTING-ADR-13I-002 — Printing Readiness Authority (server).
 *
 * Single entry point for printing setup readiness. All operator-facing readiness
 * must be derived from resolvePrintingSetupState — never from discovery legacy fields.
 */
export {
  PRINTING_READINESS_AUTHORITY_PROCEDURE,
  PRINTING_READINESS_AUTHORITATIVE_INPUTS,
  PRINTING_READINESS_CONTRACT_FIELDS,
  PRINTING_READINESS_LEGACY_FIELDS,
  PRINTING_READINESS_SUPPORT_FIELDS,
  type PrintingReadinessContractField,
} from "../../shared/printing/printingReadinessAuthority";

export {
  resolvePrintingSetupState,
  type PrintingSetupStatus,
  type PrintingSetupState,
  type PrintingOperationalState,
  type SetupNextAction,
  type SetupSeverity,
  type PrinterSetupState,
  PRINTING_SETUP_STATES,
  PRINTING_OPERATIONAL_STATES,
  SETUP_NEXT_ACTIONS,
} from "./setupState";

import { getPrintDiscoveryDiagnostics } from "./printOperationsDiscoveryService";
import { resolvePrintingSetupState } from "./setupState";
import type { ProvisioningStep } from "./printOperationsProvisioningTypes";
import type { PrintingSetupState } from "./setupState";

/**
 * Returns printing setup readiness. This is the sole authority for readiness decisions.
 */
export async function getPrintingReadinessAuthority(restaurantId: number) {
  return resolvePrintingSetupState(restaurantId);
}

/**
 * Demonstrates that legacy provisioning.step is not authoritative.
 * Used by governance tests — do not use in operator UX.
 */
export function legacyProvisioningStepConflictsWithAuthority(input: {
  legacyStep: ProvisioningStep;
  setupState: PrintingSetupState;
}): boolean {
  const { legacyStep, setupState } = input;

  if (legacyStep === "test_print" && setupState !== "READY" && setupState !== "READY_FOR_TEST") {
    return true;
  }
  if (legacyStep === "connect_agent" && setupState === "READY") {
    return true;
  }
  if (legacyStep === "add_printer" && setupState !== "NO_PRINTERS") {
    return true;
  }
  if (legacyStep === "blocked" && setupState === "READY") {
    return true;
  }

  return false;
}

/**
 * Loads legacy discovery alongside authority for support diagnostics only.
 */
export async function getPrintingReadinessWithSupport(restaurantId: number) {
  const [authority, discovery] = await Promise.all([
    resolvePrintingSetupState(restaurantId),
    getPrintDiscoveryDiagnostics(restaurantId),
  ]);

  return {
    authority,
    support: {
      discovery,
      legacyProvisioningStep: discovery.provisioning.step,
      legacyEmptyReason: discovery.emptyReason,
      legacyActivePrinters: discovery.counts.activePrinters,
    },
  };
}
