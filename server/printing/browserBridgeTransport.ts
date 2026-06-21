/**
 * THERMAL-PRINTING-5B — browser print bridge transport (contract only, no I/O).
 */
import { BROWSER_PRINT_BRIDGE_TRANSPORT_ID } from "../../shared/printing/browserBridgeTypes";
import { buildBrowserPrintRequest } from "./browserBridgePayload";
import type {
  PrintTransport,
  PrintTransportContext,
  PrintTransportResult,
} from "./transportTypes";

export class BrowserBridgeTransport implements PrintTransport {
  readonly transportId = BROWSER_PRINT_BRIDGE_TRANSPORT_ID;

  async send(
    payload: Uint8Array,
    context: PrintTransportContext
  ): Promise<PrintTransportResult> {
    const request = buildBrowserPrintRequest({
      printJobId: context.printJobId,
      restaurantId: context.restaurantId,
      payload,
    });

    return {
      success: true,
      transportId: this.transportId,
      metadata: {
        payloadSize: payload.byteLength,
        request,
      },
    };
  }
}

export const browserBridgeTransport = new BrowserBridgeTransport();
