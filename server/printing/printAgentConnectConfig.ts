/**
 * THERMAL-PRINTING-13I.1J / 13I.2E.1 — operator-facing Print Agent configuration template.
 *
 * PRINTING-ARCHITECTURE-NOTE-6: dashboard provisioning emits logical printer identity
 * and pending physicalBindings only. Authoritative Windows spooler bindings are written
 * by agent/installer (13I.2E.2+).
 */
import { ENV } from "../_core/env";
import type {
  PhysicalBindingPlaceholder,
  PhysicalBindingTransportKind,
} from "../../shared/printing/physicalBindings";
import { buildSuggestedPrintAgentId } from "./printerProfileId";

export type PrinterConnectConfigRow = {
  id: number;
  name: string;
  profileId: string;
  paperWidthMm: number;
};

/** Provisioning connect config schema revision for binding foundation. */
export const CONNECT_CONFIG_BINDING_MODEL = "13I.2E.1" as const;

function resolvePrintAgentWebSocketUrl(): string {
  const base = ENV.printHostDispatchUrl.trim();
  if (base) {
    const wsBase = base.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
    return `${wsBase}/ws/print-agent`;
  }
  return "wss://print.mineuqr.com/ws/print-agent";
}

export function buildPhysicalBindingPlaceholders(
  printers: PrinterConnectConfigRow[]
): Record<string, PhysicalBindingPlaceholder> {
  return Object.fromEntries(
    printers.map((printer) => [
      printer.profileId,
      {
        bindingStatus: "pending" as const,
        logicalPrinterId: printer.profileId,
        logicalPrinterName: printer.name,
        transportKind: "windows-spooler" satisfies PhysicalBindingTransportKind,
        dbPrinterId: printer.id,
      },
    ])
  );
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

  return {
    bindingModel: CONNECT_CONFIG_BINDING_MODEL,
    agentId: buildSuggestedPrintAgentId(restaurantId),
    agentName: "MineuQR Print Agent",
    serverUrl: resolvePrintAgentWebSocketUrl(),
    platform: "windows",
    startupPrinters,
    physicalBindings: buildPhysicalBindingPlaceholders(printers),
    usbTransportEndpoints: {},
    heartbeatIntervalMs: 30000,
    reconnectInitialDelayMs: 1000,
    reconnectMaxDelayMs: 30000,
  };
}
