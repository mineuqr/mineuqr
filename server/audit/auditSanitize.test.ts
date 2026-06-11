/**
 * ADMIN-SECURITY-CENTER PR-5 — audit sanitize tests.
 */
import { describe, expect, it } from "vitest";
import { sanitizeAuditEvent } from "./auditSanitize";
import { AUDIT_EVENT_VERSION } from "./auditTypes";

describe("auditSanitize PR-5", () => {
  it("strips password fields from snapshots", () => {
    const sanitized = sanitizeAuditEvent({
      eventType: "admin_password_reset",
      category: "USER",
      severity: "info",
      before: { password: "secret", userId: 1 },
      after: { newPassword: "other", userId: 1 },
      metadata: { passwordHash: "hash", targetUserId: 1 },
    });

    expect(sanitized.before).toEqual({ userId: 1 });
    expect(sanitized.after).toEqual({ userId: 1 });
    expect(sanitized.metadata).toEqual({ targetUserId: 1 });
  });

  it("defaults eventVersion to 1", () => {
    const sanitized = sanitizeAuditEvent({
      eventType: "user_role_changed",
      category: "USER",
      severity: "info",
    });

    expect(sanitized.eventVersion).toBe(AUDIT_EVENT_VERSION);
  });
});
