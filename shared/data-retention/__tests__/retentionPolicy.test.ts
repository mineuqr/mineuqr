/**
 * DATA-RETENTION-PLATFORM-1 — policy validation & defaults.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  buildPlatformFallbackPolicy,
  buildSettlementRecordSafePolicy,
  validateRetentionPolicy,
} from "@shared/data-retention";

describe("RetentionPolicy validation", () => {
  it("accepts platform fallback defaults", () => {
    const policy = buildPlatformFallbackPolicy(
      "financial_shift",
      "2026-07-25T00:00:00.000Z"
    );
    expect(policy.displayWindowDays).toBe(30);
    expect(policy.operationalRetentionDays).toBe(365);
    expect(policy.archiveEnabled).toBe(true);
    expect(policy.restoreEnabled).toBe(true);
    expect(policy.purgeEnabled).toBe(false);
    expect(validateRetentionPolicy(policy).ok).toBe(true);
  });

  it("rejects displayWindow > operationalRetention", () => {
    const policy = {
      ...buildPlatformFallbackPolicy("order", "2026-07-25T00:00:00.000Z"),
      displayWindowDays: 400,
      operationalRetentionDays: 365,
    };
    const result = validateRetentionPolicy(policy);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.field === "displayWindowDays")).toBe(
      true
    );
  });

  it("forbids settlement_record purge (DR-12)", () => {
    const policy = {
      ...buildSettlementRecordSafePolicy("2026-07-25T00:00:00.000Z"),
      archiveEnabled: true,
      purgeEnabled: true,
    };
    expect(validateRetentionPolicy(policy).ok).toBe(false);
  });

  it("requires archiveEnabled when purgeEnabled", () => {
    const policy = {
      ...buildPlatformFallbackPolicy("print_job", "2026-07-25T00:00:00.000Z"),
      archiveEnabled: false,
      purgeEnabled: true,
    };
    expect(validateRetentionPolicy(policy).ok).toBe(false);
  });
});
