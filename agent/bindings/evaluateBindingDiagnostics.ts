/**
 * THERMAL-PRINTING-13I.2E.2 — evaluate binding health at agent startup.
 */
import type {
  BindingDiagnosticItem,
  BindingDiagnosticsReport,
  PrinterBindingsFile,
  PrinterDiscoveryResult,
  RuntimeBindingStatus,
} from "../../shared/printing/printerBinding";
import type { AgentDeploymentConfig } from "../config/types";

function findDiscoveredPrinter(
  printers: PrinterDiscoveryResult[],
  windowsPrinterName: string
): PrinterDiscoveryResult | undefined {
  return printers.find((printer) => printer.printerName === windowsPrinterName);
}

function statusForProfile(input: {
  profileId: string;
  logicalPrinterName: string;
  storedBinding: PrinterBindingsFile["bindings"][number] | undefined;
  usbPrinterName: string | undefined;
  discovered: PrinterDiscoveryResult[];
}): BindingDiagnosticItem {
  const { profileId, logicalPrinterName, storedBinding, usbPrinterName, discovered } = input;

  if (!storedBinding && !usbPrinterName) {
    return {
      profileId,
      logicalPrinterName,
      windowsPrinterName: null,
      portName: null,
      status: "UNBOUND",
      message: "No Windows printer selected yet. Run bind-printers.",
    };
  }

  const windowsPrinterName = storedBinding?.windowsPrinterName ?? usbPrinterName ?? null;
  if (!windowsPrinterName) {
    return {
      profileId,
      logicalPrinterName,
      windowsPrinterName: null,
      portName: null,
      status: "INVALID_BINDING",
      message: "Binding record is missing windowsPrinterName.",
    };
  }

  const match = findDiscoveredPrinter(discovered, windowsPrinterName);
  if (!match) {
    return {
      profileId,
      logicalPrinterName,
      windowsPrinterName,
      portName: storedBinding?.portName ?? null,
      status: "MISSING_PRINTER",
      message: "Windows printer is not currently available on this device.",
    };
  }

  const expectedPort = storedBinding?.portName?.trim();
  if (expectedPort && expectedPort !== match.portName) {
    return {
      profileId,
      logicalPrinterName,
      windowsPrinterName,
      portName: match.portName,
      status: "INVALID_BINDING",
      message: `Port mismatch: expected ${expectedPort}, found ${match.portName}.`,
    };
  }

  return {
    profileId,
    logicalPrinterName,
    windowsPrinterName,
    portName: match.portName,
    status: "BOUND",
  };
}

export function evaluateBindingDiagnostics(input: {
  config: AgentDeploymentConfig;
  bindingsFile: PrinterBindingsFile | null;
  discoveredPrinters: PrinterDiscoveryResult[];
  configPath: string;
  bindingsPath: string;
}): BindingDiagnosticsReport {
  const bindingByProfileId = new Map(
    (input.bindingsFile?.bindings ?? []).map((binding) => [binding.profileId, binding])
  );

  const items: BindingDiagnosticItem[] = input.config.startupPrinters.map((profile) => {
    const stored = bindingByProfileId.get(profile.printerId);
    const usbEndpoint = input.config.usbTransportEndpoints[profile.printerId];
    const usbPrinterName =
      usbEndpoint && "printerName" in usbEndpoint ? usbEndpoint.printerName : undefined;

    return statusForProfile({
      profileId: profile.printerId,
      logicalPrinterName: profile.printerName,
      storedBinding: stored,
      usbPrinterName,
      discovered: input.discoveredPrinters,
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    configPath: input.configPath,
    bindingsPath: input.bindingsPath,
    items,
  };
}

export function formatBindingDiagnosticLine(item: BindingDiagnosticItem): string {
  if (item.status === "UNBOUND") {
    return `${item.logicalPrinterName} → (not bound) [${item.status}]`;
  }
  return `${item.logicalPrinterName} → ${item.windowsPrinterName} → ${item.portName ?? "—"} [${item.status}]`;
}

export function hasBlockingBindingStatus(status: RuntimeBindingStatus): boolean {
  return status !== "BOUND";
}
