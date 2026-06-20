/**
 * THERMAL-PRINTING-5A — transport layer contracts (payload-only, no I/O in abstractions).
 */

export interface PrintTransportContext {
  restaurantId: number;
  printJobId: number;
}

export interface PrintTransportResult {
  success: boolean;
  transportId: string;
  metadata?: Record<string, unknown>;
}

export interface PrintTransport {
  readonly transportId: string;
  send(payload: Uint8Array, context: PrintTransportContext): Promise<PrintTransportResult>;
}

export const NULL_PRINT_TRANSPORT_ID = "null" as const;

export type RegisteredPrintTransportId = typeof NULL_PRINT_TRANSPORT_ID | string;
