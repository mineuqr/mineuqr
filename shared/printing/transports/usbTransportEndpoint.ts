/**
 * THERMAL-PRINTING-WINDOWS-USB-2 — USB transport endpoint model.
 */
export const USB_TRANSPORT_ENDPOINT_KINDS = [
  "device-path",
  "windows-spooler",
] as const;

export type UsbTransportEndpointKind =
  (typeof USB_TRANSPORT_ENDPOINT_KINDS)[number];

export type UsbDevicePathTransportEndpoint = {
  kind: "device-path";
  devicePath: string;
};

export type UsbWindowsSpoolerTransportEndpoint = {
  kind: "windows-spooler";
  printerName: string;
  portName?: string;
};

/** Legacy shorthand without kind — normalized to device-path. */
export type UsbTransportEndpointLegacy = {
  devicePath: string;
};

export type UsbTransportEndpoint =
  | UsbDevicePathTransportEndpoint
  | UsbWindowsSpoolerTransportEndpoint
  | UsbTransportEndpointLegacy;

export type NormalizedUsbTransportEndpoint =
  | UsbDevicePathTransportEndpoint
  | UsbWindowsSpoolerTransportEndpoint;

export function normalizeUsbTransportEndpoint(
  endpoint: UsbTransportEndpoint
): NormalizedUsbTransportEndpoint {
  if ("kind" in endpoint && endpoint.kind === "windows-spooler") {
    return endpoint;
  }
  if ("kind" in endpoint && endpoint.kind === "device-path") {
    return endpoint;
  }
  return { kind: "device-path", devicePath: endpoint.devicePath };
}

export function isUsbWindowsSpoolerEndpoint(
  endpoint: NormalizedUsbTransportEndpoint
): endpoint is UsbWindowsSpoolerTransportEndpoint {
  return endpoint.kind === "windows-spooler";
}

export function isUsbDevicePathEndpoint(
  endpoint: NormalizedUsbTransportEndpoint
): endpoint is UsbDevicePathTransportEndpoint {
  return endpoint.kind === "device-path";
}
