/**
 * ADMIN-SECURITY-CENTER PR-2 — role change audit tests.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { OPS_EVENT } from "./_core/opsTaxonomy";

const { PLATFORM_OPEN_ID, opsLogMock } = vi.hoisted(() => ({
  PLATFORM_OPEN_ID: "platform_owner_open_id_pr2",
  opsLogMock: vi.fn(),
}));

vi.mock("./_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: PLATFORM_OPEN_ID,
  },
}));

vi.mock("./db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getUserById: vi.fn(),
  updateUserRole: vi.fn(),
}));

import { getUserById, updateUserRole } from "./db";
import { applyAdminUserRoleUpdate } from "./roleChangeAudit";
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
  passwordHash: null,
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
  correlationId: "corr-pr2-001",
  req: { headers: { origin: "http://localhost:3000" } },
  res: { clearCookie: vi.fn() },
};

function expectRoleChangedEvent(params: {
  procedure: string;
  targetUserId: number;
  targetUserEmail: string;
  previousRole: "user" | "admin";
  newRole: "user" | "admin";
}) {
  expect(opsLogMock).toHaveBeenCalledWith(
    expect.objectContaining({
      type: OPS_EVENT.user_role_changed,
      category: "ADMIN",
      severity: "info",
      correlationId: "corr-pr2-001",
      actorId: adminUser.id,
      role: "admin",
      route: params.procedure,
      metadata: expect.objectContaining({
        actorUserId: adminUser.id,
        actorRole: "admin",
        targetUserId: params.targetUserId,
        targetUserEmail: params.targetUserEmail,
        previousRole: params.previousRole,
        newRole: params.newRole,
        procedure: params.procedure,
      }),
    })
  );
}

describe("roleChangeAudit PR-2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
      if (id === platformUser.id) return platformUser;
      if (id === otherUser.id) return otherUser;
      if (id === adminUser.id) return adminUser;
      return null;
    });
    (updateUserRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe("Scenario 1 — user → admin", () => {
    it("emits user_role_changed with previousRole and newRole", async () => {
      await applyAdminUserRoleUpdate({
        ctx: adminContext as any,
        procedure: "admin.updateUserRole",
        userId: otherUser.id,
        role: "admin",
      });

      expect(updateUserRole).toHaveBeenCalledWith(otherUser.id, "admin");
      expectRoleChangedEvent({
        procedure: "admin.updateUserRole",
        targetUserId: otherUser.id,
        targetUserEmail: otherUser.email,
        previousRole: "user",
        newRole: "admin",
      });
    });
  });

  describe("Scenario 2 — admin → user", () => {
    it("emits user_role_changed", async () => {
      const promotedUser = { ...otherUser, role: "admin" as const };
      (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(promotedUser);

      await applyAdminUserRoleUpdate({
        ctx: adminContext as any,
        procedure: "admin.updateUserRole",
        userId: otherUser.id,
        role: "user",
      });

      expect(updateUserRole).toHaveBeenCalledWith(otherUser.id, "user");
      expectRoleChangedEvent({
        procedure: "admin.updateUserRole",
        targetUserId: otherUser.id,
        targetUserEmail: otherUser.email,
        previousRole: "admin",
        newRole: "user",
      });
    });
  });

  describe("Scenario 3 — role unchanged", () => {
    it("does not emit event or call updateUserRole", async () => {
      await applyAdminUserRoleUpdate({
        ctx: adminContext as any,
        procedure: "admin.updateUserRole",
        userId: otherUser.id,
        role: "user",
      });

      expect(updateUserRole).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });
  });

  describe("Scenario 4 — operation fails", () => {
    it("does not emit when protected platform user is blocked", async () => {
      await expect(
        applyAdminUserRoleUpdate({
          ctx: adminContext as any,
          procedure: "admin.updateUserRole",
          userId: platformUser.id,
          role: "user",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(updateUserRole).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });

    it("does not emit when self-target is blocked", async () => {
      const selfContext = {
        ...adminContext,
        user: { ...adminUser, id: otherUser.id },
      };

      await expect(
        applyAdminUserRoleUpdate({
          ctx: selfContext as any,
          procedure: "admin.updateUserRole",
          userId: otherUser.id,
          role: "admin",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(updateUserRole).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });
  });

  describe("Scenario 5 — router integration", () => {
    it("preserves protected account restrictions via admin.updateUserRole", async () => {
      const caller = appRouter.createCaller(adminContext as any);

      await expect(
        caller.admin.updateUserRole({ userId: platformUser.id, role: "user" })
      ).rejects.toBeInstanceOf(TRPCError);
      expect(updateUserRole).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });

    it("allows role change for non-platform users via admin.updateUserRole", async () => {
      const caller = appRouter.createCaller(adminContext as any);

      await caller.admin.updateUserRole({ userId: otherUser.id, role: "admin" });
      expect(updateUserRole).toHaveBeenCalledWith(otherUser.id, "admin");
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: OPS_EVENT.user_role_changed })
      );
    });
  });
});
