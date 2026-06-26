import { describe, expect, it } from "vitest";
import {
  authoritySetupWizardStep,
  authorityTestPrintPrinterId,
  canRunAuthorityTestPrint,
  isPrintingSetupReady,
  shouldOfferAddPrinterAction,
  shouldOfferConnectDeviceAction,
  shouldShowAuthorityOperatorAlert,
} from "./printingReadinessAuthority";
import type { PrintingSetupStatus } from "./printingReadinessAuthority";

function status(partial: Partial<PrintingSetupStatus>): PrintingSetupStatus {
  return {
    restaurantId: 720007,
    evaluatedAt: "2026-06-24T00:00:00.000Z",
    setupState: "NO_PRINTERS",
    operationalState: "HEALTHY",
    severity: "info",
    nextAction: "CREATE_PRINTER",
    reason: "Create a printer",
    checklist: {
      printerCreated: false,
      agentConnected: false,
      printerBound: false,
      testPrintPassed: false,
    },
    primaryPrinter: null,
    printers: [],
    agent: { agentId: null, status: null, lastSeenAt: null },
    configurationRevision: {
      revision: "abc",
      invalidationEpoch: "2026-06-24T00:00:00.000Z",
      factors: [],
    },
    diagnosticValidation: {
      primaryPrinterId: null,
      latestCompletedDiagnosticId: null,
      latestCompletedAt: null,
      validForCurrentConfiguration: false,
    },
    ...partial,
  };
}

describe("printingReadinessAuthority client selectors THERMAL-PRINTING-13I.3B.5", () => {
  it("derives wizard step from setupState only", () => {
    expect(authoritySetupWizardStep(status({ setupState: "NO_PRINTERS" }))).toBe(1);
    expect(authoritySetupWizardStep(status({ setupState: "BINDING_REQUIRED" }))).toBe(2);
    expect(authoritySetupWizardStep(status({ setupState: "READY_FOR_TEST" }))).toBe(3);
  });

  it("gates test print on authority nextAction and primary printer", () => {
    const readyForTest = status({
      setupState: "READY_FOR_TEST",
      nextAction: "RUN_TEST_PRINT",
      primaryPrinter: { printerId: 10, name: "Kitchen", profileId: "kitchen" },
    });

    expect(canRunAuthorityTestPrint(readyForTest)).toBe(true);
    expect(authorityTestPrintPrinterId(readyForTest)).toBe(10);
  });

  it("does not allow test print when legacy-style ready would be false", () => {
    const bindingRequired = status({
      setupState: "BINDING_REQUIRED",
      nextAction: "BIND_PRINTER",
      primaryPrinter: { printerId: 10, name: "Kitchen", profileId: "kitchen" },
    });

    expect(canRunAuthorityTestPrint(bindingRequired)).toBe(false);
    expect(isPrintingSetupReady(bindingRequired)).toBe(false);
  });

  it("maps operator actions from nextAction enum", () => {
    expect(shouldOfferAddPrinterAction(status({ nextAction: "CREATE_PRINTER" }))).toBe(true);
    expect(shouldOfferConnectDeviceAction(status({ nextAction: "CONNECT_AGENT" }))).toBe(true);
    expect(shouldOfferConnectDeviceAction(status({ nextAction: "NONE" }))).toBe(false);
  });

  it("shows operator alerts for degraded and blocked operational states", () => {
    expect(
      shouldShowAuthorityOperatorAlert(
        status({ setupState: "READY", operationalState: "DEGRADED", severity: "warning" })
      )
    ).toBe(true);
    expect(
      shouldShowAuthorityOperatorAlert(
        status({ setupState: "AWAITING_AGENT", operationalState: "HEALTHY", severity: "warning" })
      )
    ).toBe(true);
    expect(
      shouldShowAuthorityOperatorAlert(
        status({ setupState: "READY", operationalState: "HEALTHY", severity: "info" })
      )
    ).toBe(false);
  });
});
