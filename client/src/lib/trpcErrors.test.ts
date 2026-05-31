import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { EMAIL_NOT_VERIFIED_ERR_MSG } from "@shared/const";
import {
  formatTrpcErrorForUser,
  isEmailNotVerifiedError,
} from "./trpcErrors";

function trpcError(message: string, code = "FORBIDDEN") {
  return new TRPCClientError(message, {
    result: {
      error: {
        message,
        code: -32003,
        data: { code, httpStatus: 403 },
      },
    },
  });
}

describe("trpcErrors", () => {
  it("detects EMAIL_NOT_VERIFIED_ERR_MSG", () => {
    expect(
      isEmailNotVerifiedError(trpcError(EMAIL_NOT_VERIFIED_ERR_MSG))
    ).toBe(true);
  });

  it("detects 10003 in FORBIDDEN message", () => {
    expect(
      isEmailNotVerifiedError(trpcError("Email verification required (10003)"))
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isEmailNotVerifiedError(trpcError("Please login (10001)", "UNAUTHORIZED"))).toBe(
      false
    );
    expect(isEmailNotVerifiedError(new Error("network"))).toBe(false);
  });

  it("maps 10003 to friendly copy", () => {
    const t = (key: string) =>
      key === "auth.trpcEmailNotVerified" ? "Verify your email." : key;
    expect(
      formatTrpcErrorForUser(trpcError(EMAIL_NOT_VERIFIED_ERR_MSG), t)
    ).toBe("Verify your email.");
  });
});
