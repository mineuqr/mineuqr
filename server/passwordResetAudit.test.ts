/**
 * ADMIN-SECURITY-CENTER PR-4 — admin password reset audit tests.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { OPS_EVENT } from "./_core/opsTaxonomy";

const { PLATFORM_OPEN_ID, opsLogMock } = vi.hoisted(() => ({
  PLATFORM_OPEN_ID: "platform_owner_open_id_pr4",
  opsLogMock: vi.fn(),
}));

vi.mock("./_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: PLATFORM_OPEN_ID },
}));

vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  updateUserPassword: vi.fn(),
}));

import { getUserByEmail, getUserById, updateUserPassword } from "./db";
import { applyAdminPasswordReset } from "./passwordResetAudit";
import { appRouter } from "./routers";

const platformUser = {
  id: 1,
  openId: PLATFORM_OPEN_ID,
  name: "Platform Owner",
  email: "owner@mineuqr.com",
  role: "admin" as const,
  accountClassification: "INTERNAL" as const,
  loginMethod: "email",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  passwordHash: null,
};

const otherUser = {
  id: 5,
  openId: "user_5",
  name: "Customer",
  email: "customer@test.com",
  role: "user" as const,
  accountClassification: "COMMERCIAL" as const,
  loginMethod: "email",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  passwordHash: "existing_hash",
};

const adminUser = {
  id: 99,
  openId: "admin_99",
  name: "Other Admin",
  email: "admin@test.com",
  role: "admin" as const,
  accountClassification: "INTERNAL" as const,
  loginMethod: "email",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  passwordHash: null,
};

const adminContext = {
  user: adminUser,
  correlationId: "corr-pr4-001",
  req: { headers: { origin: "http://localhost:3000" } },
  res: { clearCookie: vi.fn() },
};

function expectPasswordResetEvent(params: {
  targetUserId: number;
  targetUserEmail: string;
}) {
  expect(opsLogMock).toHaveBeenCalledWith(
    expect.objectContaining({
      type: OPS_EVENT.admin_password_reset,
      category: "ADMIN",
      severity: "info",
      correlationId: "corr-pr4-001",
      actorId: adminUser.id,
      role: "admin",
      route: "admin.resetSubscriberPassword",
      metadata: expect.objectContaining({
        actorUserId: adminUser.id,
        actorRole: "admin",
        targetUserId: params.targetUserId,
        targetUserEmail: params.targetUserEmail,
        resetMethod: "admin_direct",
        correlationId: "corr-pr4-001",
        procedure: "admin.resetSubscriberPassword",
        timestamp: expect.any(String),
      }),
    })
  );
}

describe("passwordResetAudit PR-4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUserByEmail as ReturnType<typeof vi.fn>).mockImplementation(async (email: string) => {
      if (email === platformUser.email) return platformUser;
      if (email === otherUser.email) return otherUser;
      return null;
    });
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
      if (id === platformUser.id) return platformUser;
      if (id === otherUser.id) return otherUser;
      if (id === adminUser.id) return adminUser;
      return null;
    });
    (updateUserPassword as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe("Scenario 1 — successful reset", () => {
    it("emits admin_password_reset after password update", async () => {
      await applyAdminPasswordReset({
        ctx: adminContext as any,
        procedure: "admin.resetSubscriberPassword",
        email: otherUser.email,
        newPassword: "newpass123",
      });

      expect(updateUserPassword).toHaveBeenCalledWith(otherUser.openId, expect.any(String));
      expectPasswordResetEvent({
        targetUserId: otherUser.id,
        targetUserEmail: otherUser.email,
      });
    });
  });

  describe("Scenario 2 — failed reset", () => {
    it("does not emit when user is not found", async () => {
      await expect(
        applyAdminPasswordReset({
          ctx: adminContext as any,
          procedure: "admin.resetSubscriberPassword",
          email: "missing@test.com",
          newPassword: "newpass123",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(updateUserPassword).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });

    it("does not emit when password update fails", async () => {
      (updateUserPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("db write failed")
      );

      await expect(
        applyAdminPasswordReset({
          ctx: adminContext as any,
          procedure: "admin.resetSubscriberPassword",
          email: otherUser.email,
          newPassword: "newpass123",
        })
      ).rejects.toThrow("db write failed");

      expect(opsLogMock).not.toHaveBeenCalled();
    });
  });

  describe("Scenario 3 — protected account blocked", () => {
    it("does not emit and does not update password for platform account", async () => {
      await expect(
        applyAdminPasswordReset({
          ctx: adminContext as any,
          procedure: "admin.resetSubscriberPassword",
          email: platformUser.email,
          newPassword: "newpass123",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(updateUserPassword).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });

    it("preserves protected account restrictions via admin.resetSubscriberPassword", async () => {
      const caller = appRouter.createCaller(adminContext as any);

      await expect(
        caller.admin.resetSubscriberPassword({
          email: platformUser.email,
          newPassword: "newpass123",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(updateUserPassword).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });
  });
});
