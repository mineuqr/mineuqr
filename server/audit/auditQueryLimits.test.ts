/**
 * ADMIN-SECURITY-CENTER PR-6 — audit query limit tests.
 */
import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  AUDIT_LIST_DEFAULT_LIMIT,
  AUDIT_LIST_MAX_LIMIT,
  AUDIT_MAX_RANGE_DAYS,
  clampAuditListLimit,
  resolveAuditDateRange,
} from "./auditQueryLimits";

describe("auditQueryLimits PR-6", () => {
  it("clamps list limit to defaults and max", () => {
    expect(clampAuditListLimit(undefined)).toBe(AUDIT_LIST_DEFAULT_LIMIT);
    expect(clampAuditListLimit(500)).toBe(AUDIT_LIST_MAX_LIMIT);
    expect(clampAuditListLimit(10)).toBe(10);
  });

  it("rejects inverted date ranges", () => {
    expect(() =>
      resolveAuditDateRange({
        from: "2026-06-10T00:00:00.000Z",
        to: "2026-06-01T00:00:00.000Z",
      })
    ).toThrow(TRPCError);
  });

  it("rejects ranges exceeding max days", () => {
    expect(() =>
      resolveAuditDateRange({
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-06-01T00:00:00.000Z",
      })
    ).toThrow(TRPCError);
  });

  it("accepts valid ranges within max window", () => {
    const range = resolveAuditDateRange({
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-07T00:00:00.000Z",
    });
    expect(range.from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-06-07T00:00:00.000Z");
    expect(AUDIT_MAX_RANGE_DAYS).toBeGreaterThanOrEqual(7);
  });
});
