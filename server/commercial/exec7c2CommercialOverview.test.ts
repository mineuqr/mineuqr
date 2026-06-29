/**
 * EXEC-7C.2 — Commercial overview snapshot service integration.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import type { UserSubscriptionRow } from "../subscriptionResolver";
import { COMMERCIAL_AUTHORITY_SOURCE } from "./dto/commercialAuthority";
import { CANONICAL_METRICS_SOURCE } from "./metrics/CanonicalMetricsService";
import {
  COMMERCIAL_OVERVIEW_ASSEMBLER,
  COMMERCIAL_OVERVIEW_SCHEMA_VERSION,
} from "./metrics/CommercialOverviewSnapshot";

vi.mock("../db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  getAllUsers: vi.fn(),
  getExtendedAdminStats: vi.fn(),
  getDb: vi.fn(),
  sanitizeUserForAdminResponse: vi.fn(
    (u: { id: number; name: string | null; email: string | null; role: "user" | "admin"; createdAt: Date }) =>
      u
  ),
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

const FIXED_NOW = "2026-06-01T12:00:00.000Z";

const PLAN_CATALOG = {
  30001: {
    id: 30001,
    nameEn: "Basic",
    nameAr: "أساسي",
    maxRestaurants: 1,
    maxItemsPerRestaurant: 100,
    maxCategories: 10,
    priceMonthly: "29.00",
    priceYearly: "290.00",
  },
  30002: {
    id: 30002,
    nameEn: "Professional",
    nameAr: "احترافي",
    maxRestaurants: 5,
    maxItemsPerRestaurant: 500,
    maxCategories: 25,
    priceMonthly: "79.00",
    priceYearly: "790.00",
  },
};

function isoPlusDays(days: number): string {
  return new Date(new Date(FIXED_NOW).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function subRow(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId" | "restaurantId">
): UserSubscriptionRow {
  return {
    planId: 30002,
    status: "active",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: isoPlusDays(-10),
    currentPeriodEnd: isoPlusDays(20),
    trialEndsAt: null,
    canceledAt: null,
    createdAt: isoPlusDays(-30),
    updatedAt: isoPlusDays(-1),
    ...overrides,
  };
}

function adminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
      loginMethod: "email",
      createdAt: new Date(FIXED_NOW),
      updatedAt: new Date(FIXED_NOW),
      lastSignedIn: new Date(FIXED_NOW),
      passwordHash: null,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function userContext(): TrpcContext {
  return {
    user: {
      id: 5,
      openId: "user5",
      name: "User",
      email: "user@test.com",
      role: "user",
      loginMethod: "email",
      createdAt: new Date(FIXED_NOW),
      updatedAt: new Date(FIXED_NOW),
      lastSignedIn: new Date(FIXED_NOW),
      passwordHash: null,
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
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

describe("EXEC-7C.2 admin.getCommercialOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSubscriptionPlans as ReturnType<typeof vi.fn>).mockResolvedValue(
      Object.values(PLAN_CATALOG)
    );
    (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockImplementation(
      async (id: number) => PLAN_CATALOG[id as keyof typeof PLAN_CATALOG]
    );
    (getExtendedAdminStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalUsers: 2,
      totalRestaurants: 3,
      totalMenuItems: 0,
      totalCategories: 0,
      totalOffers: 0,
      userGrowth: [],
    });
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: async () => [{ id: 1 }, { id: 2 }],
        }),
      }),
    });
  });

  it("returns CommercialOverviewSnapshot with canonical metadata", async () => {
    mockPopulationUsers([
      { id: 5, role: "user" },
      { id: 1, role: "admin" },
    ]);
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => ({
      id,
      role: id === 1 ? "admin" : "user",
    }));
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(
      async (id: number) =>
        id === 5 ? [subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 })] : []
    );

    const caller = appRouter.createCaller(adminContext());
    const snapshot = await caller.admin.getCommercialOverview({ now: FIXED_NOW });

    expect(snapshot.metadata.schemaVersion).toBe(COMMERCIAL_OVERVIEW_SCHEMA_VERSION);
    expect(snapshot.metadata.authorityVersion).toBe(COMMERCIAL_AUTHORITY_SOURCE);
    expect(snapshot.metadata.commercialAuthoritySource).toBe(COMMERCIAL_AUTHORITY_SOURCE);
    expect(snapshot.metadata.metricsSource).toBe(CANONICAL_METRICS_SOURCE);
    expect(snapshot.metadata.assembledBy).toBe(COMMERCIAL_OVERVIEW_ASSEMBLER);
    expect(snapshot.asOf).toBe(FIXED_NOW);
    expect(snapshot.metadata.asOf).toBe(FIXED_NOW);
    expect(snapshot.generatedAt).toBeTruthy();
    expect(snapshot.metadata.generatedAt).toBe(snapshot.generatedAt);
  });

  it("executive metrics parity with analytics and dashboard summary", async () => {
    mockPopulationUsers([{ id: 5, role: "user" }]);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, role: "user" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const caller = appRouter.createCaller(adminContext());
    const [snapshot, mrr, counts, summary] = await Promise.all([
      caller.admin.getCommercialOverview({ now: FIXED_NOW }),
      caller.analytics.getMRR({ now: FIXED_NOW }),
      caller.analytics.getSubscriberCounts({ now: FIXED_NOW }),
      caller.admin.getDashboardSummary({ now: FIXED_NOW }),
    ]);

    expect(snapshot.executive.mrr).toBe(mrr.mrr);
    expect(snapshot.executive.arr).toBe(Math.round(mrr.mrr * 12 * 100) / 100);
    expect(snapshot.executive.commercialSubscribers).toBe(counts.entitledOwners);
    expect(snapshot.executive.activeSubscriptions).toBe(counts.activeSubscriptions);
    expect(snapshot.executive.activeTrials).toBe(counts.activeTrials);
    expect(snapshot.executive.activeRestaurants).toBe(summary.activeRestaurants);
    expect(snapshot.executive.totalUsers).toBe(summary.totalUsers);
  });

  it("subscription health uses authority statuses only", async () => {
    mockPopulationUsers([
      { id: 5, role: "user" },
      { id: 6, role: "user" },
      { id: 7, role: "user" },
    ]);
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => ({
      id,
      role: "user",
    }));
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
      if (id === 5) {
        return [subRow({ id: 10, userId: 5, restaurantId: 0, status: "active", planId: 30002 })];
      }
      if (id === 6) {
        return [
          subRow({
            id: 11,
            userId: 6,
            restaurantId: 0,
            status: "trial",
            planId: 30001,
            trialEndsAt: isoPlusDays(5),
          }),
        ];
      }
      if (id === 7) {
        return [
          subRow({
            id: 12,
            userId: 7,
            restaurantId: 0,
            status: "canceled",
            planId: 30001,
            currentPeriodEnd: isoPlusDays(-1),
          }),
        ];
      }
      return [];
    });

    const caller = appRouter.createCaller(adminContext());
    const snapshot = await caller.admin.getCommercialOverview({ now: FIXED_NOW });

    expect(snapshot.subscriptionHealth.active).toBe(1);
    expect(snapshot.subscriptionHealth.trial).toBe(1);
    expect(snapshot.subscriptionHealth.canceled).toBe(1);
    expect(snapshot.needsAttention.canceledAccounts).toBe(1);
    expect(snapshot.needsAttention.graceAccounts).toBeNull();
    expect(snapshot.needsAttention.suspendedAccounts).toBeNull();
    expect("grace" in snapshot.subscriptionHealth).toBe(false);
    expect("suspended" in snapshot.subscriptionHealth).toBe(false);
  });

  it("recentActivity and growth remain unavailable per EXEC-7C.1", async () => {
    mockPopulationUsers([]);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(adminContext());
    const snapshot = await caller.admin.getCommercialOverview({ now: FIXED_NOW });

    expect(snapshot.recentActivity.available).toBe(false);
    expect(snapshot.recentActivity.items).toEqual([]);
    expect(snapshot.growth.available).toBe(false);
    expect(snapshot.growth.reason).toBe("NO_CANONICAL_GROWTH_METRIC");
  });

  it("denies non-admin access", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.admin.getCommercialOverview()).rejects.toBeInstanceOf(TRPCError);
  });
});
