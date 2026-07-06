import { TRPCClientError } from "@trpc/client";
import { describe, expect, it } from "vitest";
import {
  extractDeviceAuthFailureCode,
  pairingAuthOperatorMessage,
  resolvePairingAuthMessage,
} from "../pairingAuthMessages";

describe("pairingAuthMessages", () => {
  it("maps each auth code to operator-safe text", () => {
    for (const code of [
      "invalid_credentials",
      "device_disabled",
      "token_revoked",
      "token_expired",
    ] as const) {
      const message = pairingAuthOperatorMessage(code, "en");
      expect(message).not.toContain(code);
      expect(message.length).toBeGreaterThan(20);
    }
  });

  it("extracts failure code from TRPC unauthorized message", () => {
    const error = new TRPCClientError("token_revoked", {
      result: { error: { message: "token_revoked", code: -32001, data: { code: "UNAUTHORIZED" } } },
    });
    expect(extractDeviceAuthFailureCode(error)).toBe("token_revoked");
  });

  it("resolves pairing errors to operator messages", () => {
    const error = new TRPCClientError("device_disabled", {
      result: { error: { message: "device_disabled", code: -32001, data: { code: "UNAUTHORIZED" } } },
    });
    expect(resolvePairingAuthMessage(error)).toContain("disabled");
    expect(resolvePairingAuthMessage(error)).not.toContain("device_disabled");
  });
});
