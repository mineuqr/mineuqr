import { describe, expect, it } from "vitest";
import { applyStoredPrinterBindings, upsertStoredPrinterBinding } from "./applyPrinterBindings";
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
  usbTransportEndpoints: {},
  physicalBindings: {
    "r720002-printer-abc": {
      bindingStatus: "pending",
      logicalPrinterId: "r720002-printer-abc",
      logicalPrinterName: "Kitchen Printer",
      transportKind: "windows-spooler",
    },
  },
};

describe("applyPrinterBindings THERMAL-PRINTING-13I.2E.2", () => {
  it("merges stored bindings into usbTransportEndpoints", () => {
    const merged = applyStoredPrinterBindings(baseConfig, {
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
    });

    expect(merged.usbTransportEndpoints["r720002-printer-abc"]).toEqual({
      kind: "windows-spooler",
      printerName: "EPSON TM-T20III",
      portName: "USB001",
    });
    expect(merged.physicalBindings?.["r720002-printer-abc"]).toMatchObject({
      bindingStatus: "bound",
      windowsSpoolerQueueName: "EPSON TM-T20III",
    });
  });

  it("upserts bindings by profileId", () => {
    const next = upsertStoredPrinterBinding([], {
      profileId: "a",
      logicalPrinterName: "A",
      windowsPrinterName: "Printer A",
      portName: "USB001",
      bindingStatus: "bound",
    });
    const updated = upsertStoredPrinterBinding(next, {
      profileId: "a",
      logicalPrinterName: "A",
      windowsPrinterName: "Printer B",
      portName: "USB002",
      bindingStatus: "bound",
    });

    expect(updated).toHaveLength(1);
    expect(updated[0]?.windowsPrinterName).toBe("Printer B");
  });
});
