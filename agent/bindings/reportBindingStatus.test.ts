import { describe, expect, it, vi } from "vitest";
import type { AgentDeploymentConfig } from "../config/types";
import {
  BindingStatusReportTracker,
  buildBindingStatusReportPayload,
  reportBindingStatus,
} from "./reportBindingStatus";
import { MemoryWindowsPrinterDiscoveryClient } from "./windowsPrinterDiscovery";

const baseConfig: AgentDeploymentConfig = {
  agentId: "mineuqr-agent-720002",
  agentName: "MineuQR Print Agent",
  serverUrl: "wss://print.mineuqr.com/ws/print-agent",
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
  usbTransportEndpoints: {},
};

describe("reportBindingStatus THERMAL-PRINTING-13I.3A", () => {
  it("builds BOUND payload from runtime validation", async () => {
    const discovery = new MemoryWindowsPrinterDiscoveryClient([
      { printerName: "EPSON TM-T20III", portName: "USB001" },
    ]);

    const payload = await buildBindingStatusReportPayload({
      config: {
        ...baseConfig,
        usbTransportEndpoints: {
          "r720002-printer-abc": {
            kind: "windows-spooler",
            printerName: "EPSON TM-T20III",
            portName: "USB001",
          },
        },
      },
      configPath: "config/mineuqr-agent-config.json",
      discoveryClient: discovery,
    });

    expect(payload.agentId).toBe("mineuqr-agent-720002");
    expect(payload.bindings[0]).toMatchObject({
      profileId: "r720002-printer-abc",
      logicalPrinterName: "Kitchen Printer",
      bindingStatus: "BOUND",
      windowsPrinterName: "EPSON TM-T20III",
      portName: "USB001",
    });
  });

  it("builds UNBOUND payload when no binding exists", async () => {
    const payload = await buildBindingStatusReportPayload({
      config: baseConfig,
      configPath: "config/mineuqr-agent-config.json",
      discoveryClient: new MemoryWindowsPrinterDiscoveryClient([]),
    });

    expect(payload.bindings[0]?.bindingStatus).toBe("UNBOUND");
    expect(payload.bindings[0]?.windowsPrinterName).toBeNull();
  });

  it("builds MISSING_PRINTER when bound printer is absent from Windows", async () => {
    const payload = await buildBindingStatusReportPayload({
      config: {
        ...baseConfig,
        usbTransportEndpoints: {
          "r720002-printer-abc": {
            kind: "windows-spooler",
            printerName: "EPSON TM-T20III",
            portName: "USB001",
          },
        },
      },
      configPath: "config/mineuqr-agent-config.json",
      discoveryClient: new MemoryWindowsPrinterDiscoveryClient([]),
    });

    expect(payload.bindings[0]?.bindingStatus).toBe("MISSING_PRINTER");
  });

  it("sends report once per unchanged inventory", () => {
    const sender = { send: vi.fn() };
    const tracker = new BindingStatusReportTracker();
    const payload = {
      agentId: "mineuqr-agent-720002",
      timestamp: "2026-06-24T12:34:56.000Z",
      bindings: [
        {
          profileId: "r720002-printer-abc",
          logicalPrinterName: "Kitchen Printer",
          bindingStatus: "INVALID_BINDING" as const,
          windowsPrinterName: "EPSON TM-T20III",
          portName: "USB002",
          lastValidatedAt: "2026-06-24T12:34:56.000Z",
          message: "Port mismatch",
        },
      ],
    };

    expect(reportBindingStatus({ payload, sender, tracker })).toBe(true);
    expect(reportBindingStatus({ payload, sender, tracker })).toBe(false);
    expect(sender.send).toHaveBeenCalledTimes(1);
  });
});
