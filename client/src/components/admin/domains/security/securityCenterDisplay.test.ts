import { describe, expect, it } from "vitest";
import {
  countAuditBuckets,
  hasCriticalSecurityWarnings,
  securityStatusBadgeClass,
} from "./securityCenterDisplay";

describe("securityCenterDisplay", () => {
  describe("securityStatusBadgeClass", () => {
    it("returns distinct classes for healthy, warning, and critical", () => {
      const healthy = securityStatusBadgeClass("healthy");
      const warning = securityStatusBadgeClass("warning");
      const critical = securityStatusBadgeClass("critical");

      expect(healthy).toContain("emerald");
      expect(warning).toContain("amber");
      expect(critical).toContain("red");
      expect(new Set([healthy, warning, critical]).size).toBe(3);
    });
  });

  describe("countAuditBuckets", () => {
    it("sorts buckets by count descending and omits zero values", () => {
      const items = countAuditBuckets({
        role: 2,
        subscription: 5,
        empty: 0,
      });

      expect(items).toEqual([
        { key: "subscription", count: 5 },
        { key: "role", count: 2 },
      ]);
    });

    it("returns empty array when buckets are undefined", () => {
      expect(countAuditBuckets(undefined)).toEqual([]);
    });
  });

  describe("hasCriticalSecurityWarnings", () => {
    it("detects critical warnings", () => {
      expect(
        hasCriticalSecurityWarnings([
          { severity: "warning", code: "A", message: "warn" },
          { severity: "critical", code: "B", message: "crit" },
        ])
      ).toBe(true);
    });

    it("returns false for empty warnings", () => {
      expect(hasCriticalSecurityWarnings([])).toBe(false);
      expect(hasCriticalSecurityWarnings(undefined)).toBe(false);
    });
  });
});
