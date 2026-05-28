import { describe, expect, it } from "vitest";
import type { Request } from "express";
import {
  effectiveRequestProtocol,
  getForwardedProto,
  isSecureRequest,
} from "./secureRequest";

function mockReq(input: {
  protocol?: string;
  headers?: Record<string, string | string[]>;
}): Request {
  return {
    protocol: input.protocol ?? "http",
    headers: input.headers ?? {},
  } as Request;
}

describe("secureRequest", () => {
  it("detects HTTPS from express protocol", () => {
    const req = mockReq({ protocol: "https" });
    expect(isSecureRequest(req)).toBe(true);
    expect(effectiveRequestProtocol(req)).toBe("https");
  });

  it("detects HTTPS from x-forwarded-proto", () => {
    const req = mockReq({
      protocol: "http",
      headers: { "x-forwarded-proto": "https" },
    });
    expect(isSecureRequest(req)).toBe(true);
    expect(getForwardedProto(req)).toBe("https");
  });

  it("handles comma-separated forwarded proto lists", () => {
    const req = mockReq({
      protocol: "http",
      headers: { "x-forwarded-proto": "http, https" },
    });
    expect(isSecureRequest(req)).toBe(true);
  });

  it("stays HTTP when no TLS signals", () => {
    const req = mockReq({ protocol: "http" });
    expect(isSecureRequest(req)).toBe(false);
    expect(effectiveRequestProtocol(req)).toBe("http");
  });
});
