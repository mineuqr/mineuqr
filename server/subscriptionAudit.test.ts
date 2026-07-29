/**
 * ADMIN-SECURITY-CENTER PR-3 — subscription create/update audit tests.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import type { UserSubscriptionRow } from "./subscriptionResolver";

const { PLATFORM_OPEN_ID, opsLogMock } = vi.hoisted(() => ({
  PLATFORM_OPEN_ID: "platform_owner_open_id_pr3",
  opsLogMock: vi.fn(),
}));

vi.mock("./_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: PLATFORM_OPEN_ID },
}));

vi.mock("./db", () => ({
  getUserById: vi.fn(),
  createSubscriptionForRestaurant: vi.fn(),
  updateSubscriptionById: vi.fn(),
}));

vi.mock("./services/commercial-catalog", () => ({
  ensureCommercialSnapshotBoundForSubscription: vi.fn(async () => ({
    snapshotId: "snap-test",
  })),
  classifyPlanTransitionEvent: vi.fn(() => "plan_selected"),
}));

vi.mock("./commercial/ownerAccountSubscriptionAuthority", () => ({
  ownerHasEntitledAccountSubscription: vi.fn(),
  getOwnerAccountSubscriptionRow: vi.fn(),
}));

vi.mock("./db/cascadeDeletes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db/cascadeDeletes")>();
  return {
    ...actual,
    deleteSubscriptionCascade: vi.fn(),
  };
});

import { createSubscriptionForRestaurant, getUserById, updateSubscriptionById } from "./db";
import {
  getOwnerAccountSubscriptionRow,
  ownerHasEntitledAccountSubscription,
} from "./commercial/ownerAccountSubscriptionAuthority";
import { deleteSubscriptionCascade } from "./db/cascadeDeletes";
import {
  applyAdminUserSubscriptionCreate,
  applyAdminUserSubscriptionDelete,
  applyAdminUserSubscriptionUpdate,
} from "./subscriptionAudit";
import {
  subscriptionAuditSnapshotFromRow,
  subscriptionAuditSnapshotToChangeFields,
} from "./subscriptionAuditSnapshot";
const TARGET_USER_ID = 5;
const PLATFORM_USER_ID = 1;
const SUBSCRIPTION_ID = 101;

const adminContext = {
  user: {
    id: 99,
    openId: "admin_99",
    name: "Admin",
    email: "admin@test.com",
    role: "admin" as const,
    accountClassification: "INTERNAL" as const,
    loginMethod: "email",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
  },
  correlationId: "corr-pr3-001",
  req: { headers: { origin: "http://localhost:3000" } },
  res: { clearCookie: vi.fn() },
};

function accountSub(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId">
): UserSubscriptionRow {
  return {
    restaurantId: 0,
    planId: 30002,
    status: "active",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: "2026-01-01T00:00:00.000Z",
    currentPeriodEnd: "2026-07-01T00:00:00.000Z",
    trialEndsAt: null,
    canceledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("subscriptionAudit PR-3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ownerHasEntitledAccountSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (createSubscriptionForRestaurant as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: SUBSCRIPTION_ID,
    });
    (updateSubscriptionById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (deleteSubscriptionCascade as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (getOwnerAccountSubscriptionRow as ReturnType<typeof vi.fn>).mockResolvedValue(
      accountSub({ id: SUBSCRIPTION_ID, userId: TARGET_USER_ID })
    );
  });

  describe("Scenario 1 — create subscription", () => {
    it("emits subscription_created_by_admin with snapshot", async () => {
      await applyAdminUserSubscriptionCreate({
        ctx: adminContext as any,
        procedure: "admin.createUserSubscriptionByAdmin",
        userId: TARGET_USER_ID,
        planId: 30002,
        billingCycle: "monthly",
        status: "active",
      });

      expect(createSubscriptionForRestaurant).toHaveBeenCalled();
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.subscription_created_by_admin,
          category: "ADMIN",
          correlationId: "corr-pr3-001",
          actorId: adminContext.user.id,
          route: "admin.createUserSubscriptionByAdmin",
          metadata: expect.objectContaining({
            actorUserId: adminContext.user.id,
            actorRole: "admin",
            targetUserId: TARGET_USER_ID,
            subscriptionId: SUBSCRIPTION_ID,
            plan: 30002,
            status: "active",
            startDate: expect.any(String),
            endDate: expect.any(String),
            procedure: "admin.createUserSubscriptionByAdmin",
          }),
        })
      );
    });
  });

  describe("Scenario 2 — update status", () => {
    it("records before/after snapshots", async () => {
      await applyAdminUserSubscriptionUpdate({
        ctx: adminContext as any,
        procedure: "admin.updateUserSubscriptionByAdmin",
        userId: TARGET_USER_ID,
        status: "canceled",
      });

      expect(updateSubscriptionById).toHaveBeenCalledWith(SUBSCRIPTION_ID, { status: "canceled" });
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.subscription_updated_by_admin,
          metadata: expect.objectContaining({
            subscriptionId: SUBSCRIPTION_ID,
            before: { plan: 30002, status: "active", expiration: "2026-07-01T00:00:00.000Z" },
            after: { plan: 30002, status: "canceled", expiration: "2026-07-01T00:00:00.000Z" },
          }),
        })
      );
    });
  });

  describe("Scenario 3 — update plan", () => {
    it("records before/after plan change", async () => {
      await applyAdminUserSubscriptionUpdate({
        ctx: adminContext as any,
        procedure: "admin.updateUserSubscriptionByAdmin",
        userId: TARGET_USER_ID,
        planId: 30003,
      });

      expect(updateSubscriptionById).toHaveBeenCalledWith(SUBSCRIPTION_ID, { planId: 30003 });
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.subscription_updated_by_admin,
          metadata: expect.objectContaining({
            before: expect.objectContaining({ plan: 30002 }),
            after: expect.objectContaining({ plan: 30003 }),
          }),
        })
      );
    });
  });

  describe("Scenario 4 — no-op update", () => {
    it("does not emit event or call updateSubscriptionById", async () => {
      const result = await applyAdminUserSubscriptionUpdate({
        ctx: adminContext as any,
        procedure: "admin.updateUserSubscriptionByAdmin",
        userId: TARGET_USER_ID,
        status: "active",
      });

      expect(result.changed).toBe(false);
      expect(updateSubscriptionById).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });

    it("skips empty update input", async () => {
      const result = await applyAdminUserSubscriptionUpdate({
        ctx: adminContext as any,
        procedure: "admin.updateUserSubscriptionByAdmin",
        userId: TARGET_USER_ID,
      });

      expect(result.changed).toBe(false);
      expect(updateSubscriptionById).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });
  });

  describe("Scenario 5 — failed operation", () => {
    it("does not emit when user already has entitled subscription", async () => {
      (ownerHasEntitledAccountSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(
        applyAdminUserSubscriptionCreate({
          ctx: adminContext as any,
          procedure: "admin.createUserSubscriptionByAdmin",
          userId: TARGET_USER_ID,
          planId: 30002,
          billingCycle: "monthly",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(createSubscriptionForRestaurant).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });

    it("does not emit when subscription not found", async () => {
      (getOwnerAccountSubscriptionRow as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        applyAdminUserSubscriptionUpdate({
          ctx: adminContext as any,
          procedure: "admin.updateUserSubscriptionByAdmin",
          userId: TARGET_USER_ID,
          status: "canceled",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(updateSubscriptionById).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });
  });

  describe("PR-4 Scenario 4 — subscription deleted", () => {
    it("passes before snapshot to deleteSubscriptionCascade audit context", async () => {
      const existing = accountSub({ id: SUBSCRIPTION_ID, userId: TARGET_USER_ID });
      (getOwnerAccountSubscriptionRow as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

      await applyAdminUserSubscriptionDelete({
        ctx: adminContext as any,
        procedure: "admin.deleteUserSubscriptionByAdmin",
        userId: TARGET_USER_ID,
      });

      expect(deleteSubscriptionCascade).toHaveBeenCalledWith(
        SUBSCRIPTION_ID,
        expect.objectContaining({
          procedure: "admin.deleteUserSubscriptionByAdmin",
          subscriptionBefore: {
            plan: 30002,
            status: "active",
            expiration: "2026-07-01T00:00:00.000Z",
          },
        })
      );
    });
  });

  describe("PR-4 Scenario 5 — delete fails", () => {
    it("does not emit subscription audit when delete cascade fails", async () => {
      (deleteSubscriptionCascade as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("transaction failed")
      );

      await expect(
        applyAdminUserSubscriptionDelete({
          ctx: adminContext as any,
          procedure: "admin.deleteUserSubscriptionByAdmin",
          userId: TARGET_USER_ID,
        })
      ).rejects.toThrow("transaction failed");

      expect(opsLogMock).not.toHaveBeenCalled();
    });

    it("does not call delete when subscription not found", async () => {
      (getOwnerAccountSubscriptionRow as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await expect(
        applyAdminUserSubscriptionDelete({
          ctx: adminContext as any,
          procedure: "admin.deleteUserSubscriptionByAdmin",
          userId: TARGET_USER_ID,
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(deleteSubscriptionCascade).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });
  });

  describe("PR-4 Scenario 6 — snapshot shape consistency", () => {
    it("delete before fields match update audit serialization", () => {
      const row = accountSub({ id: SUBSCRIPTION_ID, userId: TARGET_USER_ID });
      const snapshot = subscriptionAuditSnapshotFromRow(row);
      const changeFields = subscriptionAuditSnapshotToChangeFields(snapshot);

      expect(changeFields).toEqual({
        plan: 30002,
        status: "active",
        expiration: "2026-07-01T00:00:00.000Z",
      });
      expect(changeFields).not.toHaveProperty("startDate");
    });
  });

  describe("Scenario 6 — protected account rules", () => {
    it("blocks create for platform account without audit", async () => {
      (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
        if (id === PLATFORM_USER_ID) {
          return {
            id: PLATFORM_USER_ID,
            openId: PLATFORM_OPEN_ID,
            role: "admin",
            email: "owner@mineuqr.com",
          };
        }
        return null;
      });

      await expect(
        applyAdminUserSubscriptionCreate({
          ctx: adminContext as any,
          procedure: "admin.createUserSubscriptionByAdmin",
          userId: PLATFORM_USER_ID,
          planId: 30002,
          billingCycle: "monthly",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(createSubscriptionForRestaurant).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });

    it("blocks update for platform account without audit", async () => {
      (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
        if (id === PLATFORM_USER_ID) {
          return {
            id: PLATFORM_USER_ID,
            openId: PLATFORM_OPEN_ID,
            role: "admin",
          };
        }
        return null;
      });

      await expect(
        applyAdminUserSubscriptionUpdate({
          ctx: adminContext as any,
          procedure: "admin.updateUserSubscriptionByAdmin",
          userId: PLATFORM_USER_ID,
          status: "canceled",
        })
      ).rejects.toBeInstanceOf(TRPCError);

      expect(updateSubscriptionById).not.toHaveBeenCalled();
      expect(opsLogMock).not.toHaveBeenCalled();
    });
  });
});
