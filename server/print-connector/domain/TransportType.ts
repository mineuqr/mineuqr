export const TRANSPORT_TYPES = ["usb", "ethernet", "wifi", "bluetooth"] as const;

export type TransportType = (typeof TRANSPORT_TYPES)[number];

export function isTransportType(value: string): value is TransportType {
  return (TRANSPORT_TYPES as readonly string[]).includes(value);
}
