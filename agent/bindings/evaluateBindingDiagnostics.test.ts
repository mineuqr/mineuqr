import { describe, expect, it } from "vitest";
import { evaluateBindingDiagnostics, formatBindingDiagnosticLine } from "./evaluateBindingDiagnostics";
import type { AgentDeploymentConfig } from "../config/types";

const baseConfig: AgentDeploymentConfig = {
  agentId: "mineuqr-agent-1",
  agentName: "MineuQR Print Agent",
  serverUrl: "wss://example.com/ws/print-agent",
  platform: "windows",
  startupPrinters: [
    {
      printerId: "r720002-printer-abc",
      printerName: "Kitchen Printer",
      transport: "usb",
      paperWidth: 80,
      capabilities: {
        escpos: true,
        cutter: false,
        cashDrawer: false,
        qrCode: true,
        imagePrinting: false,
      },
      executionCapabilities: {
        airprint: false,
        vendorSdk: false,
      },
    },
  ],
  usbTransportEndpoints: {
    "r720002-printer-abc": {
      kind: "windows-spooler",
      printerName: "EPSON TM-T20III",
      portName: "USB001",
    },
  },
};

describe("evaluateBindingDiagnostics THERMAL-PRINTING-13I.2E.2", () => {
  it("reports BOUND when discovered printer matches binding", () => {
    const report = evaluateBindingDiagnostics({
      config: baseConfig,
      bindingsFile: {
        version: "13I.2E.2",
        updatedAt: "2026-06-24T00:00:00.000Z",
        bindings: [
          {
            profileId: "r720002-printer-abc",
            logicalPrinterName: "Kitchen Printer",
            windowsPrinterName: "EPSON TM-T20III",
            portName: "USB001",
            bindingStatus: "bound",
          },
        ],
      },
      discoveredPrinters: [{ printerName: "EPSON TM-T20III", portName: "USB001" }],
      configPath: "config/mineuqr-agent-config.json",
      bindingsPath: "config/printer-bindings.json",
    });

    expect(report.items[0]?.status).toBe("BOUND");
    expect(formatBindingDiagnosticLine(report.items[0]!)).toContain("EPSON TM-T20III");
  });

  it("reports UNBOUND when no binding exists", () => {
    const report = evaluateBindingDiagnostics({
      config: { ...baseConfig, usbTransportEndpoints: {} },
      bindingsFile: null,
      discoveredPrinters: [],
      configPath: "config/mineuqr-agent-config.json",
      bindingsPath: "config/printer-bindings.json",
    });

    expect(report.items[0]?.status).toBe("UNBOUND");
  });

  it("reports MISSING_PRINTER when Windows queue is absent", () => {
    const report = evaluateBindingDiagnostics({
      config: baseConfig,
      bindingsFile: {
        version: "13I.2E.2",
        updatedAt: "2026-06-24T00:00:00.000Z",
        bindings: [
          {
            profileId: "r720002-printer-abc",
            logicalPrinterName: "Kitchen Printer",
            windowsPrinterName: "EPSON TM-T20III",
            portName: "USB001",
            bindingStatus: "bound",
          },
        ],
      },
      discoveredPrinters: [],
      configPath: "config/mineuqr-agent-config.json",
      bindingsPath: "config/printer-bindings.json",
    });

    expect(report.items[0]?.status).toBe("MISSING_PRINTER");
  });
});
