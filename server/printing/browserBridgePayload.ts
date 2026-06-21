/**
 * THERMAL-PRINTING-5B — reversible Uint8Array ↔ Base64 serialization.
 */
import type { BrowserPrintRequest } from "../../shared/printing/browserBridgeTypes";

export function encodeUint8ArrayToBase64(payload: Uint8Array): string {
  return Buffer.from(payload).toString("base64");
}

export function decodeBase64ToUint8Array(payloadBase64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(payloadBase64, "base64"));
}

export function buildBrowserPrintRequest(input: {
  printJobId: number;
  restaurantId: number;
  payload: Uint8Array;
}): BrowserPrintRequest {
  return {
    printJobId: input.printJobId,
    restaurantId: input.restaurantId,
    payloadBase64: encodeUint8ArrayToBase64(input.payload),
  };
}
