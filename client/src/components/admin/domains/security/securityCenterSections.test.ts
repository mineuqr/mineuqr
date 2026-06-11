import { describe, expect, it } from "vitest";
import { countAuditBuckets, hasCriticalSecurityWarnings } from "./securityCenterDisplay";

/** PR-7 section behavior contracts — pure data shaping used by Security Center UI. */

describe("Security Overview stats rendering", () => {
  it("summarizes category and severity buckets for display", () => {
    const byCategory = countAuditBuckets({
      user_role_changed: 3,
      subscription_updated: 1,
    });
    const bySeverity = countAuditBuckets({
      info: 2,
      warning: 2,
    });

    expect(byCategory).toHaveLength(2);
    expect(bySeverity).toHaveLength(2);
    expect(byCategory[0]?.count).toBeGreaterThanOrEqual(byCategory[1]?.count ?? 0);
  });

  it("handles empty stats buckets", () => {
    expect(countAuditBuckets({})).toEqual([]);
  });
});

describe("Security Health states", () => {
  it("identifies critical platform warnings for banner display", () => {
    expect(
      hasCriticalSecurityWarnings([
        {
          severity: "critical",
          code: "OWNER_OPEN_ID_MISSING",
          message: "OWNER_OPEN_ID is not configured",
        },
      ])
    ).toBe(true);
  });

  it("treats warning-only health as non-critical for banner", () => {
    expect(
      hasCriticalSecurityWarnings([
        {
          severity: "warning",
          code: "PLATFORM_PROTECTION_DEGRADED",
          message: "Platform protection degraded",
        },
      ])
    ).toBe(false);
  });
});

describe("Security Warnings empty state", () => {
  it("uses empty warnings list for empty state branch", () => {
    const warnings: { severity: string; code: string; message: string }[] = [];
    expect(warnings.length).toBe(0);
    expect(hasCriticalSecurityWarnings(warnings)).toBe(false);
  });
});

describe("Protected Accounts rendering", () => {
  it("formats unresolved platform user as not resolved", () => {
    const platformUserId: number | null = null;
    const display =
      platformUserId != null ? String(platformUserId) : "not_resolved";
    expect(display).toBe("not_resolved");
  });

  it("formats configured owner open id with prefix", () => {
    const ownerOpenIdConfigured = true;
    const ownerOpenIdPrefix = "abc12345";
    const display = ownerOpenIdConfigured
      ? ownerOpenIdPrefix
        ? `configured (${ownerOpenIdPrefix}…)`
        : "configured"
      : "not_configured";
    expect(display).toBe("configured (abc12345…)");
  });
});
