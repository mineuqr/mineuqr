import { describe, expect, it } from "vitest";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import {
  createPrintAgentCapabilities,
  createPrintAgentRequest,
  createPrintAgentResponse,
  PrintAgentProtocolError,
  validateProtocolVersion,
} from "./printAgentProtocol";

describe("printAgentProtocol THERMAL-PRINTING-5C", () => {
  it("creates a print agent request from browser bridge fields", () => {
    const request = createPrintAgentRequest({
      requestId: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    expect(request).toEqual({
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      requestId: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });
  });

  it("preserves provided requestId", () => {
    const request = createPrintAgentRequest({
      requestId: "fixed-request-id",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    expect(request.requestId).toBe("fixed-request-id");
  });

  it("generates globally unique request ids by default", () => {
    const first = createPrintAgentRequest({
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });
    const second = createPrintAgentRequest({
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    expect(first.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(second.requestId).not.toBe(first.requestId);
  });

  it("maps browser print request payload deterministically", () => {
    const browserRequest = {
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G0AK",
    };

    expect(createPrintAgentRequest(browserRequest)).toMatchObject(browserRequest);
    expect(createPrintAgentRequest(browserRequest).protocolVersion).toBe("1.0");
  });

  it("creates accepted agent responses", () => {
    const response = createPrintAgentResponse({
      requestId: "req-1",
      accepted: true,
    });

    expect(response).toEqual({
      protocolVersion: "1.0",
      requestId: "req-1",
      accepted: true,
    });
  });

  it("creates rejected agent responses with error", () => {
    const response = createPrintAgentResponse({
      requestId: "req-1",
      accepted: false,
      error: "Printer unavailable",
    });

    expect(response).toEqual({
      protocolVersion: "1.0",
      requestId: "req-1",
      accepted: false,
      error: "Printer unavailable",
    });
  });

  it("validates supported protocol version", () => {
    expect(() => validateProtocolVersion("1.0")).not.toThrow();
  });

  it("rejects unknown protocol versions", () => {
    expect(() => validateProtocolVersion("2.0")).toThrow(PrintAgentProtocolError);
    expect(() => createPrintAgentResponse({
      requestId: "req-1",
      accepted: true,
      protocolVersion: "9.9",
    })).toThrow(PrintAgentProtocolError);
  });

  it("creates capability messages for supported platforms", () => {
    const capabilities = createPrintAgentCapabilities({
      platform: "windows",
      transports: ["usb", "lan"],
      printers: 1,
    });

    expect(capabilities).toEqual({
      protocolVersion: "1.0",
      platform: "windows",
      transports: ["usb", "lan"],
      printers: 1,
    });
  });

  it("supports android and ios capability platforms", () => {
    expect(
      createPrintAgentCapabilities({
        platform: "android",
        transports: ["bluetooth"],
        printers: 2,
      }).platform
    ).toBe("android");

    expect(
      createPrintAgentCapabilities({
        platform: "ios",
        transports: ["airprint"],
        printers: 1,
      }).platform
    ).toBe("ios");
  });

  it("rejects invalid request input", () => {
    expect(() =>
      createPrintAgentRequest({
        printJobId: 0,
        restaurantId: 1,
        payloadBase64: "G2QC",
      })
    ).toThrow(PrintAgentProtocolError);

    expect(() =>
      createPrintAgentResponse({
        requestId: "req-1",
        accepted: false,
      })
    ).toThrow(PrintAgentProtocolError);
  });
});
