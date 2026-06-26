/**
 * PRINTING-ADR-13I-002 — legacy discovery fields (support / engineering only).
 *
 * Do not use these types or fields for operator readiness decisions.
 * Use printOps.getPrintingSetupStatus via printingReadinessAuthority.ts.
 */
import type { RouterOutputs } from "@/lib/trpc";

export type LegacyPrintingDiscoveryDiagnostics =
  RouterOutputs["printOps"]["getDiscoveryDiagnostics"];

/** Fields that must never determine operator readiness. */
export type LegacyPrintingDiscoveryField =
  | "provisioning.step"
  | "emptyReason"
  | "isInventoryEmpty"
  | "counts.activePrinters"
  | "bindingStatus";

export const LEGACY_PRINTING_DISCOVERY_NOTICE =
  "Legacy discovery fields are support diagnostics only. Operator readiness must use getPrintingSetupStatus.";
