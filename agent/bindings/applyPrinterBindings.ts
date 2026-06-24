/**
 * THERMAL-PRINTING-13I.2E.2 — merge local bindings into deployment config.
 */
import type { PhysicalBindingBound, PhysicalBindingEntry } from "../../shared/printing/physicalBindings";
import type {
  PrinterBindingsFile,
  StoredPrinterBinding,
} from "../../shared/printing/printerBinding";
import type { UsbTransportEndpoint } from "../../shared/printing/transports/transportContracts";
import type { AgentDeploymentConfig } from "../config/types";

function toBoundPhysicalBinding(binding: StoredPrinterBinding): PhysicalBindingBound {
  return {
    bindingStatus: "bound",
    logicalPrinterId: binding.profileId,
    logicalPrinterName: binding.logicalPrinterName,
    transportKind: "windows-spooler",
    windowsSpoolerQueueName: binding.windowsPrinterName,
    portName: binding.portName,
  };
}

function toUsbEndpoint(binding: StoredPrinterBinding): UsbTransportEndpoint {
  const endpoint: UsbTransportEndpoint = {
    kind: "windows-spooler",
    printerName: binding.windowsPrinterName,
  };
  if (binding.portName?.trim()) {
    return { ...endpoint, portName: binding.portName.trim() };
  }
  return endpoint;
}

export function applyStoredPrinterBindings(
  config: AgentDeploymentConfig,
  bindingsFile: PrinterBindingsFile
): AgentDeploymentConfig {
  const bindingByProfileId = new Map(
    bindingsFile.bindings.map((binding) => [binding.profileId, binding])
  );

  const usbTransportEndpoints: Record<string, UsbTransportEndpoint> = {
    ...config.usbTransportEndpoints,
  };
  const physicalBindings: Record<string, PhysicalBindingEntry> = {
    ...(config.physicalBindings ?? {}),
  };

  for (const profile of config.startupPrinters) {
    if (profile.transport !== "usb") {
      continue;
    }

    const stored = bindingByProfileId.get(profile.printerId);
    if (!stored || stored.bindingStatus !== "bound") {
      continue;
    }

    usbTransportEndpoints[profile.printerId] = toUsbEndpoint(stored);
    physicalBindings[profile.printerId] = toBoundPhysicalBinding(stored);
  }

  return {
    ...config,
    usbTransportEndpoints,
    physicalBindings,
  };
}

export function upsertStoredPrinterBinding(
  bindings: StoredPrinterBinding[],
  next: StoredPrinterBinding
): StoredPrinterBinding[] {
  const withoutProfile = bindings.filter((binding) => binding.profileId !== next.profileId);
  return [...withoutProfile, next];
}
