/**
 * EXEC-3 — API-level tests for canonical dashboard read layer.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  getAllUsers: vi.fn(),
  getExtendedAdminStats: vi.fn(),
  getDb: vi.fn(),
  sanitizeUserForAdminResponse: vi.fn((u: { id: number; name: string | null; email: string | null; role: "user" | "admin"; createdAt: Date }) => u),
}));

import {
  getAllUsers,
  getDb,
  getExtendedAdminStats,
  getSubscriptionPlanById,
  getSubscriptionPlans,
  getSubscriptionsByUser,
  getUserById,
} from "../db";
import { appRouter } from "../routers";
import {
  COMMERCIAL_PLAN_CATALOG,
  COMMERCIAL_TEST_NOW,
  commercialTestSubRow,
  installCommercialTestClock,
} from "./__tests__/commercialTestFixtures";

const FIXED_NOW = COMMERCIAL_TEST_NOW;
const PLAN_CATALOG = COMMERCIAL_PLAN_CATALOG;

function subRow(
  overrides: Parameters<typeof commercialTestSubRow>[0]
) {
  return commercialTestSubRow(overrides);
}

function adminContext(): TrpcContext {
  return {
    user: { id: 1, role: "admin", openId: "admin", name: "Admin", email: "a@test.com" },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    correlationId: "test",
  } as TrpcContext;
}

function userContext(): TrpcContext {
  return {
    user: { id: 5, role: "user", openId: "user", name: "User", email: "u@test.com" },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    correlationId: "test",
  } as TrpcContext;
}

function mockPopulationUsers(
  users: Array<{ id: number; role: "user" | "admin"; accountClassification?: "COMMERCIAL" | "INTERNAL" | "SYSTEM" }>
) {
  const normalized = users.map((u) => ({
    ...u,
    accountClassification:
      u.accountClassification ?? (u.role === "admin" ? "INTERNAL" : "COMMERCIAL"),
  }));
  (getAllUsers as ReturnType<typeof vi.fn>).mockImplementation(
    async (opts?: { classificationFilter?: "COMMERCIAL" | "INTERNAL" | "SYSTEM" }) => {
      if (opts?.classificationFilter) {
        return normalized.filter((u) => u.accountClassification === opts.classificationFilter);
      }
      return normalized;
    }
  );
}

describe("EXEC-3 dashboard API layer", () => {
  installCommercialTestClock();

  beforeEach(() => {
    vi.clearAllMocks();
    (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockImplementation(
      async (id: number) => PLAN_CATALOG[id as keyof typeof PLAN_CATALOG]
    );
    (getSubscriptionPlans as ReturnType<typeof vi.fn>).mockResolvedValue(
      Object.values(PLAN_CATALOG)
    );
    (getExtendedAdminStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalUsers: 2,
      totalRestaurants: 5,
      totalMenuItems: 4,
      totalCategories: 2,
      totalOffers: 0,
      totalSubscriptions: 4,
      userGrowth: [],
    });
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
        }),
      }),
    });
  });

  it("commercial.getOwnerCommercialState returns CRS authority for admin", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, role: "user" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const caller = appRouter.createCaller(adminContext());
    const state = await caller.commercial.getOwnerCommercialState({ ownerId: 5 });

    expect(state.ownerId).toBe(5);
    expect(state.planCode).toBe("PROFESSIONAL");
    expect(state.authoritySource).toBe("S1_CANONICAL");
  });

  it("commercial.getOwnerPlan returns plan slice from CRS", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, role: "user" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const caller = appRouter.createCaller(adminContext());
    const plan = await caller.commercial.getOwnerPlan({ ownerId: 5 });

    expect(plan.planCode).toBe("PROFESSIONAL");
    expect(plan.planName).toBe("Professional");
  });

  it("denies non-admin access to commercial admin read APIs", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(
      caller.commercial.getOwnerCommercialState({ ownerId: 5 })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("admin.getOwnerOverview composes user + commercial from CRS", async () => {
    (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 5, name: "Test", email: "t@test.com", role: "user", createdAt: FIXED_NOW },
    ]);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, role: "user" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const caller = appRouter.createCaller(adminContext());
    const overview = await caller.admin.getOwnerOverview({ ownerId: 5 });

    expect(overview.owner.id).toBe(5);
    expect(overview.commercial.planCode).toBe("PROFESSIONAL");
  });

  it("admin.getDashboardSummary uses canonical metrics source", async () => {
    mockPopulationUsers([{ id: 5, role: "user" }]);
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => ({
      id,
      role: id === 1 ? "admin" : "user",
    }));
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(
      async (id: number) =>
        id === 5 ? [subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 })] : []
    );

    const caller = appRouter.createCaller(adminContext());
    const summary = await caller.admin.getDashboardSummary();

    expect(summary.metricsSource).toBe("CANONICAL_OWNER");
    expect(summary.mrr).toBe(79);
    expect(summary.activeSubscriptions).toBe(1);
    expect(summary.totalUsers).toBe(2);
    expect(summary.activeRestaurants).toBe(2);
  });

  it("analytics.getMRR uses owner-based canonical accounting", async () => {
    mockPopulationUsers([{ id: 14760004, role: "user" }]);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 14760004, role: "user" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 1, userId: 14760004, restaurantId: 720003, planId: 30001 }),
      subRow({ id: 2, userId: 14760004, restaurantId: 720005, planId: 30001 }),
      subRow({ id: 3, userId: 14760004, restaurantId: 720006, planId: 30002 }),
    ]);

    const caller = appRouter.createCaller(adminContext());
    const { mrr, metricsSource } = await caller.analytics.getMRR();

    expect(metricsSource).toBe("CANONICAL_OWNER");
    expect(mrr).toBe(0);
  });

  it("analytics.getSubscriberCounts counts owners not rows", async () => {
    mockPopulationUsers([{ id: 5, role: "user" }]);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, role: "user" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const caller = appRouter.createCaller(adminContext());
    const counts = await caller.analytics.getSubscriberCounts();

    expect(counts.activeSubscriptions).toBe(1);
    expect(counts.metricsSource).toBe("CANONICAL_OWNER");
  });

  it("legacy commercial.getEntitlements unchanged for owner self-read", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, role: "user" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const caller = appRouter.createCaller(userContext());
    const result = await caller.commercial.getEntitlements();

    expect(result.entitlements.plan).toBe("PROFESSIONAL");
    expect(result.context.ownerId).toBe(5);
  });
});
