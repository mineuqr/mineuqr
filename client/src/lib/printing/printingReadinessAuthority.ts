/**
 * PRINTING-ADR-13I-002 — client printing readiness selectors.
 *
 * All dashboard readiness decisions must flow through these helpers.
 * Do not infer readiness from getDiscoveryDiagnostics legacy fields.
 */
import type { RouterOutputs } from "@/lib/trpc";
import {
  PRINTING_READINESS_AUTHORITY_PROCEDURE,
  PRINTING_READINESS_CONTRACT_FIELDS,
  PRINTING_READINESS_LEGACY_FIELDS,
} from "../../../../shared/printing/printingReadinessAuthority";

export type PrintingSetupStatus = RouterOutputs["printOps"]["getPrintingSetupStatus"];

export {
  PRINTING_READINESS_AUTHORITY_PROCEDURE,
  PRINTING_READINESS_CONTRACT_FIELDS,
  PRINTING_READINESS_LEGACY_FIELDS,
};

export function isPrintingSetupReady(status: PrintingSetupStatus | undefined): boolean {
  return status?.setupState === "READY";
}

export function isPrintingOperationallyHealthy(status: PrintingSetupStatus | undefined): boolean {
  return status?.operationalState === "HEALTHY";
}

export function canRunAuthorityTestPrint(status: PrintingSetupStatus | undefined): boolean {
  if (!status) {
    return false;
  }
  return (
    status.nextAction === "RUN_TEST_PRINT" &&
    status.primaryPrinter != null &&
    (status.setupState === "READY_FOR_TEST" || status.setupState === "READY")
  );
}

export function authorityTestPrintPrinterId(status: PrintingSetupStatus | undefined): number | null {
  if (!canRunAuthorityTestPrint(status)) {
    return null;
  }
  return status?.primaryPrinter?.printerId ?? null;
}

export type AuthoritySetupWizardStep = 1 | 2 | 3;

export function authoritySetupWizardStep(status: PrintingSetupStatus | undefined): AuthoritySetupWizardStep {
  if (!status) {
    return 1;
  }

  switch (status.setupState) {
    case "NO_PRINTERS":
      return 1;
    case "AWAITING_AGENT":
    case "AGENT_CONNECTED":
    case "BINDING_REQUIRED":
    case "BINDING_INVALID":
      return 2;
    case "READY_FOR_TEST":
    case "READY":
      return 3;
    default:
      return 1;
  }
}

export function authorityStepLabel(status: PrintingSetupStatus | undefined, isAr: boolean): string {
  if (!status) {
    return isAr ? "جاري التحميل..." : "Loading...";
  }

  switch (status.nextAction) {
    case "CREATE_PRINTER":
      return isAr ? "أضف طابعة" : "Add Printer";
    case "INSTALL_AGENT":
      return isAr ? "ثبّت الوكيل" : "Install Agent";
    case "CONNECT_AGENT":
      return isAr ? "اربط الجهاز" : "Connect Device";
    case "BIND_PRINTER":
      return isAr ? "اربط الطابعة" : "Bind Printer";
    case "FIX_BINDING":
      return isAr ? "أصلح الربط" : "Fix Binding";
    case "RUN_TEST_PRINT":
      return isAr ? "اختبر الطباعة" : "Test Print";
    case "RESOLVE_CONFLICT":
      return isAr ? "حل التعارض" : "Resolve Conflict";
    case "NONE":
      return isAr ? "جاهز للطباعة" : "Ready to Print";
    default:
      return status.reason;
  }
}

export function shouldShowAuthorityOperatorAlert(
  status: PrintingSetupStatus | undefined
): boolean {
  if (!status) {
    return false;
  }
  if (status.setupState === "READY" && status.operationalState === "HEALTHY") {
    return false;
  }
  return status.severity === "warning" || status.severity === "error";
}

export function shouldOfferConnectDeviceDownload(status: PrintingSetupStatus | undefined): boolean {
  if (!status) {
    return false;
  }
  return status.checklist.printerCreated;
}

export function shouldOfferAddPrinterAction(status: PrintingSetupStatus | undefined): boolean {
  return status?.nextAction === "CREATE_PRINTER";
}

export function shouldOfferConnectDeviceAction(status: PrintingSetupStatus | undefined): boolean {
  if (!status) {
    return false;
  }
  return (
    status.nextAction === "INSTALL_AGENT" ||
    status.nextAction === "CONNECT_AGENT" ||
    status.nextAction === "BIND_PRINTER"
  );
}

/**
 * Guards against deriving readiness from legacy discovery fields in new code.
 */
export function assertReadinessFromAuthority(
  status: PrintingSetupStatus | undefined
): asserts status is PrintingSetupStatus {
  if (!status?.setupState) {
    throw new Error(
      `Printing readiness must come from ${PRINTING_READINESS_AUTHORITY_PROCEDURE}, not legacy discovery fields.`
    );
  }
}
