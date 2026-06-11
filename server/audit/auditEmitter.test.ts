/**
 * ADMIN-SECURITY-CENTER PR-5 — dual-write audit emitter tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { AUDIT_EVENT_VERSION } from "./auditTypes";

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

import { emitAuditEvent, setAuditPersistFnForTests } from "./auditEmitter";
import { logUserRoleChanged } from "../roleChangeAudit";
import { logSubscriptionCreatedByAdmin } from "../subscriptionAudit";
import { logAdminPasswordReset } from "../passwordResetAudit";

const persistedRows: Array<Record<string, unknown>> = [];
const persistMock = vi.fn(async (event: Record<string, unknown>) => {
  persistedRows.push(event);
  return { id: persistedRows.length };
});

const adminContext = {
  user: {
    id: 99,
    openId: "admin_99",
    role: "admin" as const,
  },
  correlationId: "corr-pr5-001",
  req: { headers: { origin: "http://localhost:3000" } },
  res: { clearCookie: vi.fn() },
};

describe("auditEmitter PR-5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistedRows.length = 0;
    setAuditPersistFnForTests(persistMock);
  });

  afterEach(() => {
    setAuditPersistFnForTests(async () => ({ id: 1 }));
  });

  describe("Scenario 1 — successful dual write", () => {
    it("emits opsLog and persists audit_events row", async () => {
      emitAuditEvent({
        eventType: OPS_EVENT.user_role_changed,
        category: "USER",
        severity: "info",
        opsCategory: "ADMIN",
        actorId: 99,
        actorRole: "admin",
        targetType: "user",
        targetId: 5,
        procedure: "admin.updateUserRole",
        metadata: { previousRole: "user", newRole: "admin" },
      });

      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.user_role_changed,
          category: "ADMIN",
          severity: "info",
        })
      );

      await vi.waitFor(() => {
        expect(persistMock).toHaveBeenCalledTimes(1);
      });

      expect(persistedRows[0]).toMatchObject({
        eventType: OPS_EVENT.user_role_changed,
        eventVersion: AUDIT_EVENT_VERSION,
        category: "USER",
        actorId: 99,
        targetType: "user",
        targetId: 5,
      });
    });
  });

  describe("Scenario 2 — persistence failure", () => {
    it("does not throw and emits audit_persist_failed", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      persistMock.mockRejectedValueOnce(new Error("insert failed"));

      expect(() =>
        emitAuditEvent({
          eventType: OPS_EVENT.admin_password_reset,
          category: "USER",
          severity: "info",
          targetType: "user",
          targetId: 5,
        })
      ).not.toThrow();

      await vi.waitFor(() => {
        expect(opsLogMock).toHaveBeenCalledWith(
          expect.objectContaining({ type: OPS_EVENT.audit_persist_failed, severity: "error" })
        );
      });

      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: OPS_EVENT.admin_password_reset })
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Scenario 3 — role audit persistence", () => {
    it("stores user_role_changed with before/after", async () => {
      logUserRoleChanged({
        ctx: adminContext as any,
        procedure: "admin.updateUserRole",
        targetUserId: 5,
        targetUserEmail: "user@test.com",
        previousRole: "user",
        newRole: "admin",
        accountClassification: "COMMERCIAL",
      });

      await vi.waitFor(() => {
        expect(persistMock).toHaveBeenCalled();
      });

      expect(persistedRows[0]).toMatchObject({
        eventType: OPS_EVENT.user_role_changed,
        eventVersion: 1,
        before: { userId: 5, role: "user", accountClassification: "COMMERCIAL" },
        after: { userId: 5, role: "admin", accountClassification: "COMMERCIAL" },
      });
    });
  });

  describe("Scenario 4 — subscription audit persistence", () => {
    it("stores subscription_created_by_admin with after snapshot", async () => {
      logSubscriptionCreatedByAdmin({
        ctx: adminContext as any,
        procedure: "admin.createUserSubscriptionByAdmin",
        targetUserId: 5,
        subscriptionId: 101,
        snapshot: {
          plan: 30002,
          status: "active",
          startDate: "2026-01-01T00:00:00.000Z",
          expiration: "2026-07-01T00:00:00.000Z",
        },
      });

      await vi.waitFor(() => {
        expect(persistMock).toHaveBeenCalled();
      });

      expect(persistedRows[0]).toMatchObject({
        eventType: OPS_EVENT.subscription_created_by_admin,
        category: "SUBSCRIPTION",
        targetType: "subscription",
        targetId: 101,
        after: {
          plan: 30002,
          status: "active",
          startDate: "2026-01-01T00:00:00.000Z",
          expiration: "2026-07-01T00:00:00.000Z",
        },
      });
    });
  });

  describe("Scenario 5 — password reset audit persistence", () => {
    it("stores admin_password_reset without password fields", async () => {
      logAdminPasswordReset({
        ctx: adminContext as any,
        procedure: "admin.resetSubscriberPassword",
        targetUserId: 5,
        targetUserEmail: "user@test.com",
        resetMethod: "admin_direct",
      });

      await vi.waitFor(() => {
        expect(persistMock).toHaveBeenCalled();
      });

      expect(persistedRows[0]).toMatchObject({
        eventType: OPS_EVENT.admin_password_reset,
        targetType: "user",
        targetId: 5,
      });
      const row = persistedRows[0] as Record<string, unknown>;
      expect(row.metadata).not.toHaveProperty("password");
      expect(row.metadata).not.toHaveProperty("passwordHash");
      expect(row.metadata).not.toHaveProperty("newPassword");
    });
  });

  describe("Scenario 6 — event versioning", () => {
    it("persists eventVersion = 1 by default", async () => {
      emitAuditEvent({
        eventType: OPS_EVENT.account_classification_changed,
        category: "USER",
        severity: "info",
      });

      await vi.waitFor(() => {
        expect(persistMock).toHaveBeenCalled();
      });

      expect(persistedRows[0]?.eventVersion).toBe(1);
    });
  });
});
