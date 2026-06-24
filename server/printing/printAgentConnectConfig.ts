/**
 * THERMAL-PRINTING-13I.1J — operator-facing Print Agent configuration template.
 */
import { ENV } from "../_core/env";
import { buildSuggestedPrintAgentId } from "./printerProfileId";

export type PrinterConnectConfigRow = {
  id: number;
  name: string;
  profileId: string;
  paperWidthMm: number;
};

function resolvePrintAgentWebSocketUrl(): string {
  const base = ENV.printHostDispatchUrl.trim();
  if (base) {
    const wsBase = base.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
    return `${wsBase}/ws/print-agent`;
  }
  return "wss://print.mineuqr.com/ws/print-agent";
}

export function buildPrintAgentConnectConfig(
  restaurantId: number,
  printers: PrinterConnectConfigRow[]
): Record<string, unknown> {
  const startupPrinters = printers.map((printer) => ({
    printerId: printer.profileId,
    printerName: printer.name,
    transport: "usb" as const,
    paperWidth: printer.paperWidthMm === 58 ? (58 as const) : (80 as const),
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
  }));

  const usbTransportEndpoints = Object.fromEntries(
    printers.map((printer) => [
      printer.profileId,
      {
        kind: "windows-spooler",
        printerName: printer.name,
        portName: "USB001",
      },
    ])
  );

  return {
    agentId: buildSuggestedPrintAgentId(restaurantId),
    agentName: "MineuQR Print Agent",
    serverUrl: resolvePrintAgentWebSocketUrl(),
    platform: "windows",
    startupPrinters,
    usbTransportEndpoints,
    heartbeatIntervalMs: 30000,
    reconnectInitialDelayMs: 1000,
    reconnectMaxDelayMs: 30000,
  };
}
