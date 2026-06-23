import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  assertValidPrintHostApiKey,
  readPrintHostApiKeyFromRequest,
} from "./printHostDispatchAuth";

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

describe("printHostDispatchAuth THERMAL-PRINTING-13H.3", () => {
  it("reads the API key header", () => {
    const key = readPrintHostApiKeyFromRequest({
      headers: { "x-print-host-api-key": "secret-key" },
    } as never);

    expect(key).toBe("secret-key");
  });

  it("accepts a matching API key", () => {
    expect(() =>
      assertValidPrintHostApiKey({
        providedKey: "secret-key",
        expectedKey: "secret-key",
        correlationId: "corr-1",
      })
    ).not.toThrow();
  });

  it("rejects a missing API key", () => {
    expect(() =>
      assertValidPrintHostApiKey({
        providedKey: undefined,
        expectedKey: "secret-key",
        correlationId: "corr-2",
      })
    ).toThrow(TRPCError);

    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.dispatch_auth_rejected,
        metadata: expect.objectContaining({ reason: "missing_api_key" }),
      })
    );
  });

  it("rejects an invalid API key", () => {
    expect(() =>
      assertValidPrintHostApiKey({
        providedKey: "wrong-key",
        expectedKey: "secret-key",
        correlationId: "corr-3",
      })
    ).toThrow(TRPCError);

    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.dispatch_auth_rejected,
        metadata: expect.objectContaining({ reason: "invalid_api_key" }),
      })
    );
  });
});
