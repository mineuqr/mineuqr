import { describe, expect, it } from "vitest";
import {
  appendAuditEventPage,
  extractRoleChangeDisplay,
  formatSubscriptionChangeSummary,
  isSubscriptionChangeEventType,
} from "./auditEventDisplay";

describe("auditEventDisplay PR-8", () => {
  describe("extractRoleChangeDisplay", () => {
    it("reads role change fields from metadata and before/after", () => {
      const row = extractRoleChangeDisplay({
        actorId: 1,
        targetId: 5,
        before: { userId: 5, role: "user" },
        after: { userId: 5, role: "admin" },
        metadata: {
          previousRole: "user",
          newRole: "admin",
          targetUserId: 5,
        },
      });

      expect(row).toEqual({
        actorId: 1,
        targetUserId: 5,
        previousRole: "user",
        newRole: "admin",
      });
    });
  });

  describe("formatSubscriptionChangeSummary", () => {
    it("summarizes subscription create events", () => {
      const summary = formatSubscriptionChangeSummary({
        eventType: "subscription_created_by_admin",
        after: { plan: 30002, status: "active" },
      });

      expect(summary.afterSummary).toContain("plan 30002");
      expect(summary.beforeSummary).toBe("—");
    });

    it("summarizes subscription update events", () => {
      const summary = formatSubscriptionChangeSummary({
        eventType: "subscription_updated_by_admin",
        before: { plan: 1, status: "trial" },
        after: { plan: 2, status: "active" },
      });

      expect(summary.beforeSummary).toContain("trial");
      expect(summary.afterSummary).toContain("active");
    });

    it("marks cascade delete after summary as deleted when empty", () => {
      const summary = formatSubscriptionChangeSummary({
        eventType: "cascade_subscription_deleted",
        before: { plan: 1, status: "active" },
      });

      expect(summary.beforeSummary).toContain("active");
      expect(summary.afterSummary).toBe("deleted");
    });
  });

  describe("isSubscriptionChangeEventType", () => {
    it("recognizes subscription governance event types", () => {
      expect(isSubscriptionChangeEventType("subscription_created_by_admin")).toBe(
        true
      );
      expect(isSubscriptionChangeEventType("user_role_changed")).toBe(false);
    });
  });

  describe("appendAuditEventPage", () => {
    it("appends unique events for pagination", () => {
      const first = [{ id: 3 }, { id: 2 }];
      const second = [{ id: 2 }, { id: 1 }];
      expect(appendAuditEventPage(first, second)).toEqual([
        { id: 3 },
        { id: 2 },
        { id: 1 },
      ]);
    });

    it("returns existing list when page is empty", () => {
      const existing = [{ id: 1 }];
      expect(appendAuditEventPage(existing, [])).toBe(existing);
    });
  });
});
