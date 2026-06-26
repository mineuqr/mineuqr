import { describe, expect, it } from "vitest";
import {
  computeConfigurationRevision,
  isDiagnosticValidForConfiguration,
} from "./configurationRevision";
import { buildConfigurationRevisionFactor } from "./resolvePrinterSetupState";

const samplePrinter = {
  id: 10,
  restaurantId: 720007,
  name: "Kitchen",
  paperWidthMm: 80 as const,
  profileId: "kitchen-printer-10",
  isDefault: true,
  createdAt: "2026-06-24 00:00:00",
  updatedAt: "2026-06-24 10:00:00.000Z",
};

describe("configurationRevision THERMAL-PRINTING-13I.3B", () => {
  it("produces stable revision fingerprints for identical configuration", () => {
    const factor = buildConfigurationRevisionFactor({
      printer: samplePrinter,
      binding: {
        printerId: 10,
        profileId: "kitchen-printer-10",
        logicalPrinterName: "Kitchen",
        agentId: "mineuqr-agent-720007",
        bindingStatus: "BOUND",
        windowsPrinterName: "EPSON",
        portName: "USB001",
        lastValidatedAt: "2026-06-24T12:00:00.000Z",
        message: null,
      },
    });

    const first = computeConfigurationRevision([factor]);
    const second = computeConfigurationRevision([factor]);

    expect(first.revision).toBe(second.revision);
    expect(first.invalidationEpoch).toBe("2026-06-24T12:00:00.000Z");
  });

  it("invalidates diagnostics completed before configuration changes", () => {
    const revision = computeConfigurationRevision([
      buildConfigurationRevisionFactor({
        printer: samplePrinter,
        binding: {
          printerId: 10,
          profileId: "kitchen-printer-10",
          logicalPrinterName: "Kitchen",
          agentId: "mineuqr-agent-720007",
          bindingStatus: "BOUND",
          windowsPrinterName: "EPSON",
          portName: "USB001",
          lastValidatedAt: "2026-06-24T13:00:00.000Z",
          message: null,
        },
      }),
    ]);

    expect(
      isDiagnosticValidForConfiguration({
        diagnostic: {
          id: 1,
          diagnosticId: "diag_1",
          restaurantId: 720007,
          printerId: 10,
          agentId: "mineuqr-agent-720007",
          triggeredByUserId: 1,
          triggeredByLabel: "tester",
          status: "completed",
          error: null,
          createdAt: "2026-06-24T12:00:00.000Z",
          completedAt: "2026-06-24T12:30:00.000Z",
        },
        primaryPrinterId: 10,
        configurationRevision: revision,
        currentAssignedAgentId: "mineuqr-agent-720007",
      })
    ).toBe(false);

    expect(
      isDiagnosticValidForConfiguration({
        diagnostic: {
          id: 2,
          diagnosticId: "diag_2",
          restaurantId: 720007,
          printerId: 10,
          agentId: "mineuqr-agent-720007",
          triggeredByUserId: 1,
          triggeredByLabel: "tester",
          status: "completed",
          error: null,
          createdAt: "2026-06-24T13:30:00.000Z",
          completedAt: "2026-06-24T13:30:00.000Z",
        },
        primaryPrinterId: 10,
        configurationRevision: revision,
        currentAssignedAgentId: "mineuqr-agent-720007",
      })
    ).toBe(true);
  });
});
