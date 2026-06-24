import { describe, expect, it } from "vitest";
import {
  validateAgentPrinterBindingReportItem,
  validateAgentPrinterBindingReportPayload,
} from "../../shared/printing/printerBindingReport";

describe("printerBindingReport THERMAL-PRINTING-13I.3A", () => {
  it("validates a BOUND binding report item", () => {
    const item = validateAgentPrinterBindingReportItem({
      profileId: "r720002-printer-abc",
      logicalPrinterName: "Kitchen Printer",
      bindingStatus: "BOUND",
      windowsPrinterName: "EPSON TM-T20III",
      portName: "USB001",
      lastValidatedAt: "2026-06-24T12:34:56.000Z",
    });

    expect(item.bindingStatus).toBe("BOUND");
    expect(item.windowsPrinterName).toBe("EPSON TM-T20III");
  });

  it("validates UNBOUND without windows printer name", () => {
    const item = validateAgentPrinterBindingReportItem({
      profileId: "r720002-printer-abc",
      logicalPrinterName: "Kitchen Printer",
      bindingStatus: "UNBOUND",
      windowsPrinterName: null,
      portName: null,
      lastValidatedAt: "2026-06-24T12:34:56.000Z",
    });

    expect(item.bindingStatus).toBe("UNBOUND");
  });

  it("rejects BOUND without windowsPrinterName", () => {
    expect(() =>
      validateAgentPrinterBindingReportItem({
        profileId: "r720002-printer-abc",
        logicalPrinterName: "Kitchen Printer",
        bindingStatus: "BOUND",
        windowsPrinterName: null,
        portName: null,
        lastValidatedAt: "2026-06-24T12:34:56.000Z",
      })
    ).toThrow(/requires windowsPrinterName/);
  });

  it("validates full payload inventory", () => {
    const payload = validateAgentPrinterBindingReportPayload({
      agentId: "mineuqr-agent-720002",
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [
        {
          profileId: "r720002-printer-abc",
          logicalPrinterName: "Kitchen Printer",
          bindingStatus: "MISSING_PRINTER",
          windowsPrinterName: "EPSON TM-T20III",
          portName: "USB001",
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
          message: "Windows printer is not currently available on this device.",
        },
      ],
    });

    expect(payload.bindings).toHaveLength(1);
    expect(payload.bindings[0]?.bindingStatus).toBe("MISSING_PRINTER");
  });
});
