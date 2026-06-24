/**
 * THERMAL-PRINTING-12B — deployment configuration validation (fail fast).
 */
import {
  fingerprintPrinterProfilesInventory,
  isPrinterProfileTransport,
  validatePrinterProfile,
  type PrinterProfile,
} from "../../shared/printing/printerProfiles";
import {
  normalizeUsbTransportEndpoint,
  type UsbTransportEndpoint,
} from "../../shared/printing/transports/transportContracts";
import {
  isPendingPhysicalBinding,
  type PhysicalBindingEntry,
} from "../../shared/printing/physicalBindings";
import type {
  AgentDeploymentConfig,
  AgentDeploymentConfigFile,
  DeploymentPrinterProfileRef,
} from "./types";

export class AgentDeploymentConfigError extends Error {
  readonly diagnostics: string[];

  constructor(message: string, diagnostics: string[] = []) {
    const detail =
      diagnostics.length > 0
        ? `${message}\n${diagnostics.map((entry) => `  - ${entry}`).join("\n")}`
        : message;
    super(detail);
    this.name = "AgentDeploymentConfigError";
    this.diagnostics = diagnostics;
  }
}

const DEFAULT_PRINTER_CAPABILITIES: PrinterProfile["capabilities"] = {
  escpos: true,
  cutter: false,
  cashDrawer: false,
  qrCode: true,
  imagePrinting: false,
};

const DEFAULT_EXECUTION_CAPABILITIES: PrinterProfile["executionCapabilities"] = {
  airprint: false,
  vendorSdk: false,
};

function assertNonEmptyString(value: unknown, field: string, diagnostics: string[]): string {
  if (typeof value !== "string" || !value.trim()) {
    diagnostics.push(`${field} is required`);
    return "";
  }
  return value.trim();
}

function normalizeStartupPrinter(
  entry: PrinterProfile | DeploymentPrinterProfileRef,
  index: number
): PrinterProfile {
  const ref = entry as DeploymentPrinterProfileRef;
  const printerId = (ref.printerId ?? ref.id ?? "").trim();
  const printerName = (ref.printerName ?? printerId).trim();
  const transport = ref.transport ?? "usb";
  const paperWidth = ref.paperWidth ?? 80;

  return validatePrinterProfile({
    printerId,
    printerName,
    transport,
    paperWidth,
    capabilities: ref.capabilities ?? DEFAULT_PRINTER_CAPABILITIES,
    executionCapabilities: ref.executionCapabilities ?? DEFAULT_EXECUTION_CAPABILITIES,
  } as PrinterProfile);
}

function validateUsbEndpoint(
  profilePrinterId: string,
  endpoint: UsbTransportEndpoint | undefined,
  diagnostics: string[]
): void {
  if (!endpoint) {
    diagnostics.push(
      `Missing usbTransportEndpoints entry for USB profile "${profilePrinterId}"`
    );
    return;
  }

  try {
    const normalized = normalizeUsbTransportEndpoint(endpoint);
    if (normalized.kind === "windows-spooler") {
      if (!normalized.printerName.trim()) {
        diagnostics.push(
          `usbTransportEndpoints["${profilePrinterId}"]: windows-spooler printerName is required`
        );
      }
      return;
    }
    if (!normalized.devicePath.trim()) {
      diagnostics.push(
        `usbTransportEndpoints["${profilePrinterId}"]: device-path devicePath is required`
      );
    }
  } catch (error) {
    diagnostics.push(
      `usbTransportEndpoints["${profilePrinterId}"]: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function validatePhysicalBindingPlaceholder(
  profilePrinterId: string,
  entry: PhysicalBindingEntry,
  diagnostics: string[]
): void {
  if (entry.logicalPrinterId !== profilePrinterId) {
    diagnostics.push(
      `physicalBindings["${profilePrinterId}"]: logicalPrinterId must match profileId`
    );
  }
  if (!entry.logicalPrinterName.trim()) {
    diagnostics.push(
      `physicalBindings["${profilePrinterId}"]: logicalPrinterName is required`
    );
  }
  if (entry.transportKind !== "windows-spooler") {
    diagnostics.push(
      `physicalBindings["${profilePrinterId}"]: unsupported transportKind "${entry.transportKind}"`
    );
  }
}

function validateUsbTransportRequirement(
  profilePrinterId: string,
  usbEndpoint: UsbTransportEndpoint | undefined,
  physicalBinding: PhysicalBindingEntry | undefined,
  diagnostics: string[]
): void {
  if (usbEndpoint) {
    validateUsbEndpoint(profilePrinterId, usbEndpoint, diagnostics);
    return;
  }

  if (isPendingPhysicalBinding(physicalBinding)) {
    validatePhysicalBindingPlaceholder(profilePrinterId, physicalBinding, diagnostics);
    return;
  }

  validateUsbEndpoint(profilePrinterId, undefined, diagnostics);
}

function validateNetworkEndpoint(
  profilePrinterId: string,
  endpoint: { host?: string; port?: number } | undefined,
  diagnostics: string[]
): void {
  if (!endpoint) {
    diagnostics.push(
      `Missing networkTransportEndpoints entry for network profile "${profilePrinterId}"`
    );
    return;
  }
  if (!endpoint.host?.trim()) {
    diagnostics.push(
      `networkTransportEndpoints["${profilePrinterId}"]: host is required`
    );
  }
  if (!Number.isInteger(endpoint.port) || (endpoint.port ?? 0) <= 0) {
    diagnostics.push(
      `networkTransportEndpoints["${profilePrinterId}"]: port must be a positive integer`
    );
  }
}

function validateBluetoothEndpoint(
  profilePrinterId: string,
  endpoint: { devicePath?: string } | undefined,
  diagnostics: string[]
): void {
  if (!endpoint?.devicePath?.trim()) {
    diagnostics.push(
      `Missing or invalid bluetoothTransportEndpoints entry for bluetooth profile "${profilePrinterId}"`
    );
  }
}

export function validateDeploymentConfigFile(
  raw: unknown
): AgentDeploymentConfig {
  const diagnostics: string[] = [];

  if (!raw || typeof raw !== "object") {
    throw new AgentDeploymentConfigError("Deployment config must be a JSON object");
  }

  const file = raw as AgentDeploymentConfigFile;

  const agentId = assertNonEmptyString(file.agentId, "agentId", diagnostics);
  const serverUrl = assertNonEmptyString(file.serverUrl, "serverUrl", diagnostics);
  const agentName = assertNonEmptyString(file.agentName ?? file.agentId, "agentName", diagnostics);

  if (file.platform !== undefined && file.platform !== "windows") {
    diagnostics.push(
      `platform "${file.platform}" is not supported for deployment config (expected "windows")`
    );
  }

  if (!Array.isArray(file.startupPrinters) || file.startupPrinters.length === 0) {
    diagnostics.push("startupPrinters must contain at least one printer profile");
  }

  const startupPrinters: PrinterProfile[] = [];
  const profileIdCounts = new Map<string, number>();

  if (Array.isArray(file.startupPrinters)) {
    for (const [index, entry] of file.startupPrinters.entries()) {
      try {
        const profile = normalizeStartupPrinter(entry, index);
        startupPrinters.push(profile);
        profileIdCounts.set(
          profile.printerId,
          (profileIdCounts.get(profile.printerId) ?? 0) + 1
        );
      } catch (error) {
        diagnostics.push(
          `startupPrinters[${index}]: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  for (const [profileId, count] of profileIdCounts.entries()) {
    if (count > 1) {
      diagnostics.push(`Duplicate profileId "${profileId}" in startupPrinters`);
    }
  }

  const fingerprints = startupPrinters.map(
    (profile) => fingerprintPrinterProfilesInventory([profile])
  );
  const duplicateProfiles = fingerprints.filter(
    (fingerprint, index) => fingerprints.indexOf(fingerprint) !== index
  );
  if (duplicateProfiles.length > 0) {
    diagnostics.push("Duplicate printer profile definitions in startupPrinters");
  }

  const usbTransportEndpoints = file.usbTransportEndpoints ?? {};
  const physicalBindings = file.physicalBindings ?? {};
  const networkTransportEndpoints = file.networkTransportEndpoints ?? {};
  const bluetoothTransportEndpoints = file.bluetoothTransportEndpoints ?? {};

  for (const profile of startupPrinters) {
    if (!isPrinterProfileTransport(profile.transport)) {
      diagnostics.push(`Profile "${profile.printerId}": unsupported transport`);
      continue;
    }

    switch (profile.transport) {
      case "usb":
        validateUsbTransportRequirement(
          profile.printerId,
          usbTransportEndpoints[profile.printerId],
          physicalBindings[profile.printerId],
          diagnostics
        );
        break;
      case "network":
        validateNetworkEndpoint(
          profile.printerId,
          networkTransportEndpoints[profile.printerId],
          diagnostics
        );
        break;
      case "bluetooth":
        validateBluetoothEndpoint(
          profile.printerId,
          bluetoothTransportEndpoints[profile.printerId],
          diagnostics
        );
        break;
      default:
        diagnostics.push(`Profile "${profile.printerId}": unsupported transport "${profile.transport}"`);
    }
  }

  for (const endpointProfileId of Object.keys(usbTransportEndpoints)) {
    if (!startupPrinters.some((profile) => profile.printerId === endpointProfileId)) {
      diagnostics.push(
        `usbTransportEndpoints["${endpointProfileId}"] has no matching startupPrinters profile`
      );
    }
  }

  for (const bindingProfileId of Object.keys(physicalBindings)) {
    if (!startupPrinters.some((profile) => profile.printerId === bindingProfileId)) {
      diagnostics.push(
        `physicalBindings["${bindingProfileId}"] has no matching startupPrinters profile`
      );
    }
  }

  if (diagnostics.length > 0) {
    throw new AgentDeploymentConfigError("Invalid agent deployment configuration", diagnostics);
  }

  return {
    agentId,
    agentName,
    serverUrl,
    platform: "windows",
    startupPrinters,
    usbTransportEndpoints,
    physicalBindings:
      Object.keys(physicalBindings).length > 0 ? physicalBindings : undefined,
    networkTransportEndpoints:
      Object.keys(networkTransportEndpoints).length > 0
        ? networkTransportEndpoints
        : undefined,
    bluetoothTransportEndpoints:
      Object.keys(bluetoothTransportEndpoints).length > 0
        ? bluetoothTransportEndpoints
        : undefined,
    identityStorePath: file.identityStorePath?.trim() || undefined,
    heartbeatIntervalMs: file.heartbeatIntervalMs,
    reconnectInitialDelayMs: file.reconnectInitialDelayMs,
    reconnectMaxDelayMs: file.reconnectMaxDelayMs,
  };
}
