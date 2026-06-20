/**
 * THERMAL-PRINTING-5A — no-op transport for tests and lifecycle validation.
 */
import {
  NULL_PRINT_TRANSPORT_ID,
  type PrintTransport,
  type PrintTransportContext,
  type PrintTransportResult,
} from "./transportTypes";

export class NullPrintTransport implements PrintTransport {
  readonly transportId = NULL_PRINT_TRANSPORT_ID;

  async send(
    payload: Uint8Array,
    context: PrintTransportContext
  ): Promise<PrintTransportResult> {
    return {
      success: true,
      transportId: this.transportId,
      metadata: {
        byteLength: payload.byteLength,
        restaurantId: context.restaurantId,
        printJobId: context.printJobId,
      },
    };
  }
}

export const nullPrintTransport = new NullPrintTransport();
