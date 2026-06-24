import { describe, expect, it } from "vitest";
import { validateDeploymentConfigFile } from "./validateDeploymentConfig";
import type { AgentDeploymentConfigFile } from "./types";

const baseUsbProfile = {
  printerId: "pos-80c-copy-1-usb001",
  printerName: "POS-80C (copy 1)",
  transport: "usb" as const,
  paperWidth: 80 as const,
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
};

function buildValidConfig(
  overrides: Partial<AgentDeploymentConfigFile> = {}
): AgentDeploymentConfigFile {
  return {
    agentId: "mineuqr-agent-1",
    agentName: "MineuQR Print Agent",
    serverUrl: "wss://example.com/ws/print-agent",
    platform: "windows",
    startupPrinters: [baseUsbProfile],
    usbTransportEndpoints: {
      "pos-80c-copy-1-usb001": {
        kind: "windows-spooler",
        printerName: "POS-80C (copy 1)",
        portName: "USB001",
      },
    },
    ...overrides,
  };
}

describe("validateDeploymentConfig THERMAL-PRINTING-12B", () => {
  it("accepts a valid single-printer deployment config", () => {
    const config = validateDeploymentConfigFile(buildValidConfig());

    expect(config.agentId).toBe("mineuqr-agent-1");
    expect(config.startupPrinters).toHaveLength(1);
    expect(config.usbTransportEndpoints["pos-80c-copy-1-usb001"]).toEqual({
      kind: "windows-spooler",
      printerName: "POS-80C (copy 1)",
      portName: "USB001",
    });
  });

  it("accepts shorthand printer id alias", () => {
    const config = validateDeploymentConfigFile(
      buildValidConfig({
        startupPrinters: [{ id: "pos-80c-copy-1-usb001", printerName: "POS-80C (copy 1)" }],
      })
    );

    expect(config.startupPrinters[0]?.printerId).toBe("pos-80c-copy-1-usb001");
  });

  it("rejects empty startupPrinters", () => {
    expect(() =>
      validateDeploymentConfigFile(buildValidConfig({ startupPrinters: [] }))
    ).toThrow(/startupPrinters must contain at least one printer profile/);
  });

  it("rejects duplicate profileIds", () => {
    expect(() =>
      validateDeploymentConfigFile(
        buildValidConfig({
          startupPrinters: [baseUsbProfile, { ...baseUsbProfile }],
        })
      )
    ).toThrow(/Duplicate profileId/);
  });

  it("rejects missing usb endpoint for usb profile", () => {
    expect(() =>
      validateDeploymentConfigFile(
        buildValidConfig({
          usbTransportEndpoints: {},
        })
      )
    ).toThrow(/Missing usbTransportEndpoints entry/);
  });

  it("accepts pending physical binding without usbTransportEndpoints (13I.2E.1)", () => {
    const config = validateDeploymentConfigFile(
      buildValidConfig({
        usbTransportEndpoints: {},
        physicalBindings: {
          "pos-80c-copy-1-usb001": {
            bindingStatus: "pending",
            logicalPrinterId: "pos-80c-copy-1-usb001",
            logicalPrinterName: "POS-80C (copy 1)",
            transportKind: "windows-spooler",
          },
        },
      })
    );

    expect(config.usbTransportEndpoints).toEqual({});
    expect(config.physicalBindings?.["pos-80c-copy-1-usb001"]?.bindingStatus).toBe("pending");
  });

  it("rejects orphan usb endpoint keys", () => {
    expect(() =>
      validateDeploymentConfigFile(
        buildValidConfig({
          usbTransportEndpoints: {
            "pos-80c-copy-1-usb001": {
              kind: "windows-spooler",
              printerName: "POS-80C (copy 1)",
            },
            orphan: {
              kind: "windows-spooler",
              printerName: "Orphan",
            },
          },
        })
      )
    ).toThrow(/orphan/);
  });

  it("accepts multi-station kitchen/coffee/dessert profiles", () => {
    const config = validateDeploymentConfigFile(
      buildValidConfig({
        startupPrinters: [
          { ...baseUsbProfile, printerId: "kitchen-printer-usb001", printerName: "Kitchen" },
          { ...baseUsbProfile, printerId: "coffee-printer-usb002", printerName: "Coffee" },
          { ...baseUsbProfile, printerId: "dessert-printer-usb003", printerName: "Dessert" },
        ],
        usbTransportEndpoints: {
          "kitchen-printer-usb001": {
            kind: "windows-spooler",
            printerName: "Kitchen POS-80C",
            portName: "USB001",
          },
          "coffee-printer-usb002": {
            kind: "windows-spooler",
            printerName: "Coffee POS-80C",
            portName: "USB002",
          },
          "dessert-printer-usb003": {
            kind: "windows-spooler",
            printerName: "Dessert POS-80C",
            portName: "USB003",
          },
        },
      })
    );

    expect(config.startupPrinters.map((profile) => profile.printerName)).toEqual([
      "Kitchen",
      "Coffee",
      "Dessert",
    ]);
  });
});
