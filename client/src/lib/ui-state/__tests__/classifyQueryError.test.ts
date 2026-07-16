import { TRPCClientError } from "@trpc/client";
import { describe, expect, it } from "vitest";
import {
  classifyQueryError,
  isUnsafeErrorMessage,
} from "../classifyQueryError";
import { formatUserFacingQueryError } from "../userFacingQueryError";

function trpcError(code: string, message: string) {
  return new TRPCClientError(message, {
    result: {
      error: {
        message,
        code: 0,
        data: { code, httpStatus: 500, path: "restaurant.list" },
      },
    },
  });
}

describe("classifyQueryError", () => {
  it("classifies authz codes", () => {
    expect(classifyQueryError(trpcError("UNAUTHORIZED", "nope"))).toBe(
      "unauthorized"
    );
    expect(classifyQueryError(trpcError("FORBIDDEN", "nope"))).toBe(
      "forbidden"
    );
  });

  it("classifies SQL leaks as database", () => {
    expect(
      classifyQueryError(
        trpcError(
          "INTERNAL_SERVER_ERROR",
          "Failed query: Unknown column 'tax_mode'"
        )
      )
    ).toBe("database");
  });
});

describe("formatUserFacingQueryError", () => {
  const t = (key: string) => key;

  it("never surfaces SQL to the user", () => {
    const msg = formatUserFacingQueryError(
      trpcError(
        "INTERNAL_SERVER_ERROR",
        "Failed query: select `tax_mode` from restaurants"
      ),
      t
    );
    expect(msg).toBe("uiState.errorDatabase");
    expect(msg.toLowerCase()).not.toContain("select");
    expect(msg.toLowerCase()).not.toContain("tax_mode");
  });

  it("marks unsafe messages", () => {
    expect(isUnsafeErrorMessage("Unknown column 'tax_mode'")).toBe(true);
    expect(isUnsafeErrorMessage("Please verify your email")).toBe(false);
  });
});
