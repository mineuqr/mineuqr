import { beforeEach, describe, expect, it } from "vitest";
import { BROWSER_PRINT_BRIDGE_TRANSPORT_ID } from "../../shared/printing/browserBridgeTypes";
import { BrowserBridgeTransport } from "./browserBridgeTransport";
import {
  buildBrowserPrintRequest,
  decodeBase64ToUint8Array,
  encodeUint8ArrayToBase64,
} from "./browserBridgePayload";
import {
  clearRegisteredTransports,
  getTransport,
  registerDefaultTransports,
} from "./transportRegistry";

describe("browserBridgeTransport THERMAL-PRINTING-5B", () => {
  beforeEach(() => {
    clearRegisteredTransports();
    registerDefaultTransports();
  });

  it("registers and resolves browser-bridge transport", () => {
    const transport = getTransport(BROWSER_PRINT_BRIDGE_TRANSPORT_ID);
    expect(transport).toBeInstanceOf(BrowserBridgeTransport);
  });

  it("serializes payload to base64 deterministically", () => {
    const payload = Uint8Array.from([0x1b, 0x40, 0x0a]);
    expect(encodeUint8ArrayToBase64(payload)).toBe("G0AK");
    expect(encodeUint8ArrayToBase64(payload)).toBe(encodeUint8ArrayToBase64(payload));
  });

  it("round-trips payload bytes without loss", () => {
    const payload = Uint8Array.from([27, 100, 2, 0x1b, 0x64, 0x02]);
    const roundTripped = decodeBase64ToUint8Array(encodeUint8ArrayToBase64(payload));
    expect(roundTripped).toEqual(payload);
  });

  it("builds BrowserPrintRequest from context and payload", () => {
    const payload = Uint8Array.from([0x1b, 0x64, 0x02]);
    const request = buildBrowserPrintRequest({
      printJobId: 100,
      restaurantId: 1,
      payload,
    });

    expect(request).toEqual({
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });
  });

  it("returns successful send result with request metadata", async () => {
    const transport = getTransport(BROWSER_PRINT_BRIDGE_TRANSPORT_ID)!;
    const payload = Uint8Array.from([0x1b, 0x64, 0x02]);

    const result = await transport.send(payload, {
      restaurantId: 1,
      printJobId: 100,
    });

    expect(result).toEqual({
      success: true,
      transportId: BROWSER_PRINT_BRIDGE_TRANSPORT_ID,
      metadata: {
        payloadSize: 3,
        request: {
          printJobId: 100,
          restaurantId: 1,
          payloadBase64: "G2QC",
        },
      },
    });
  });

  it("does not mutate payload bytes during send", async () => {
    const transport = new BrowserBridgeTransport();
    const payload = Uint8Array.from([1, 2, 3]);
    const original = Array.from(payload);

    await transport.send(payload, { restaurantId: 1, printJobId: 100 });

    expect(Array.from(payload)).toEqual(original);
  });
});
