/**
 * THERMAL-PRINTING-5A — transport registration and resolution.
 */
import { browserBridgeTransport } from "./browserBridgeTransport";
import { nullPrintTransport } from "./nullTransport";
import {
  NULL_PRINT_TRANSPORT_ID,
  type PrintTransport,
} from "./transportTypes";

const transports = new Map<string, PrintTransport>();

function normalizeTransportId(transportId: string): string {
  const normalized = transportId.trim();
  if (!normalized) {
    throw new Error("Print transport id is required");
  }
  return normalized;
}

export function registerTransport(transport: PrintTransport): void {
  const transportId = normalizeTransportId(transport.transportId);
  transports.set(transportId, transport);
}

export function getTransport(transportId: string): PrintTransport | undefined {
  return transports.get(normalizeTransportId(transportId));
}

export function listRegisteredTransportIds(): string[] {
  return Array.from(transports.keys()).sort();
}

export function clearRegisteredTransports(): void {
  transports.clear();
}

export function registerDefaultTransports(): void {
  registerTransport(nullPrintTransport);
  registerTransport(browserBridgeTransport);
}

registerDefaultTransports();
