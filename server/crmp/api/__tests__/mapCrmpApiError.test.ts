import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  CrmpConflictError,
  CrmpInvariantError,
  CrmpNotFoundError,
  CrmpValidationError,
} from "@shared/crmp";
import { throwCrmpApiError } from "../mapCrmpApiError";

describe("mapCrmpApiError", () => {
  it("maps not found", () => {
    try {
      throwCrmpApiError(new CrmpNotFoundError("Register not found: x"));
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
      expect((e as TRPCError).message).not.toMatch(/stack|SELECT|drizzle/i);
    }
  });

  it("maps conflict and invariant (shift active)", () => {
    try {
      throwCrmpApiError(
        new CrmpInvariantError(
          "Register cannot close Duty while a Financial Shift is active"
        )
      );
    } catch (e) {
      expect((e as TRPCError).code).toBe("CONFLICT");
      expect((e as TRPCError).message).toContain("financial shift is active");
    }
    try {
      throwCrmpApiError(
        new CrmpConflictError(
          "Financial Shift version conflict: expected 1, found 2"
        )
      );
    } catch (e) {
      expect((e as TRPCError).code).toBe("CONFLICT");
      expect((e as TRPCError).message).toMatch(/stale/i);
    }
    try {
      throwCrmpApiError(
        new CrmpConflictError(
          "Register already has a Financial Shift with this shift number"
        )
      );
    } catch (e) {
      expect((e as TRPCError).code).toBe("CONFLICT");
      expect((e as TRPCError).message).toBe("Register operation conflict");
      expect((e as TRPCError).message).not.toMatch(/not found|SELECT|ER_DUP/i);
    }
  });

  it("maps validation to BAD_REQUEST", () => {
    try {
      throwCrmpApiError(new CrmpValidationError("bad"));
    } catch (e) {
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  it("rethrows TRPCError unchanged", () => {
    const err = new TRPCError({ code: "FORBIDDEN", message: "x" });
    expect(() => throwCrmpApiError(err)).toThrow(err);
  });
});
