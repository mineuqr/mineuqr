/**
 * ADMIN-AUTH-1C — commercial population exclusion by accountClassification.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../subscriptionResolver";
import { commercialReadService } from "./CommercialReadService";
import { commercialReportService } from "./reporting/CommercialReportService";
import { projectCommercialAnalytics } from "./reporting/analyticsProjection";
import { canonicalMetricsService } from "./metrics/CanonicalMetricsService";
import { isCommercialPopulationMember } from "./commercialPopulation";

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
    (u: { id: number; name: string | null; email: string | null; role: "user" | "admin" }) => u
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
  30002: {
    id: 30002,
    nameEn: "Professional",
    nameAr: "احترافي",
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

function adminContext() {
  return {
    user: {
      id: 99,
      openId: "admin",
      name: "Admin",
      email: "admin@test.com",
      role: "admin" as const,
      accountClassification: "INTERNAL" as const,
      loginMethod: "email",
      createdAt: new Date(FIXED_NOW),
      updatedAt: new Date(FIXED_NOW),
      lastSignedIn: new Date(FIXED_NOW),
      passwordHash: null,
    },
    req: { headers: {} },
    res: {},
  };
}

describe("ADMIN-AUTH-1C commercial population", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSubscriptionPlans as ReturnType<typeof vi.fn>).mockResolvedValue(
      Object.values(PLAN_CATALOG)
    );
    (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockImplementation(
      async (id: number) => PLAN_CATALOG[id as keyof typeof PLAN_CATALOG]
    );
    (getExtendedAdminStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalUsers: 3,
      totalRestaurants: 1,
      totalMenuItems: 0,
      totalCategories: 0,
      totalOffers: 0,
      userGrowth: [],
    });
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: async () => [],
          then: (resolve: (v: unknown) => void) => resolve([]),
        }),
      }),
    });
  });

  it("isCommercialPopulationMember accepts COMMERCIAL only", () => {
    expect(isCommercialPopulationMember({ accountClassification: "COMMERCIAL" })).toBe(true);
    expect(isCommercialPopulationMember({ accountClassification: "INTERNAL" })).toBe(false);
    expect(isCommercialPopulationMember({ accountClassification: "SYSTEM" })).toBe(false);
  });

  it("getAllOwnerCommercialStates loads COMMERCIAL users only", async () => {
    (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 5, role: "user", accountClassification: "COMMERCIAL" },
    ]);
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => ({
      id,
      role: id === 1 ? "admin" : "user",
      accountClassification:
        id === 1 ? "INTERNAL" : id === 9 ? "SYSTEM" : "COMMERCIAL",
    }));
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(
      async (userId: number) =>
        userId === 5
          ? [subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 })]
          : []
    );

    const states = await commercialReadService.getAllOwnerCommercialStates(new Date(FIXED_NOW));

    expect(getAllUsers).toHaveBeenCalledWith({ classificationFilter: "COMMERCIAL" });
    expect(states).toHaveLength(1);
    expect(states[0]?.ownerId).toBe(5);
  });

  it("INTERNAL admin is excluded from commercial subscribers and ADMIN plan bucket", async () => {
    (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 5, role: "user", accountClassification: "COMMERCIAL" },
    ]);
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => ({
      id,
      role: "user",
      accountClassification: "COMMERCIAL",
    }));
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const snapshot = await canonicalMetricsService.getCommercialOverviewSnapshot(
      { totalUsers: 3, activeRestaurants: 0 },
      new Date(FIXED_NOW)
    );

    expect(snapshot.executive.commercialSubscribers).toBe(1);
    expect(snapshot.executive.mrr).toBe(0);
    expect(snapshot.planDistribution.entries.find((e) => e.planCode === "ADMIN")).toBeUndefined();
  });

  it("SYSTEM account never enters commercial KPI population", async () => {
    (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 5, role: "user", accountClassification: "COMMERCIAL" },
    ]);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      role: "user",
      accountClassification: "COMMERCIAL",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const states = await commercialReadService.getAllOwnerCommercialStates(new Date(FIXED_NOW));

    expect(states.every((s) => s.ownerId === 5)).toBe(true);
    expect(states.some((s) => s.ownerId === 9)).toBe(false);
  });

  it("overview, export package, and analytics projection agree at fixed asOf", async () => {
    (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 5, role: "user", accountClassification: "COMMERCIAL" },
    ]);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      role: "user",
      accountClassification: "COMMERCIAL",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const caller = appRouter.createCaller(adminContext() as any);
    const [overview, analytics, pkg] = await Promise.all([
      caller.admin.getCommercialOverview({ now: FIXED_NOW }),
      caller.admin.getCommercialAnalytics({ now: FIXED_NOW }),
      commercialReportService.buildCommercialExportPackage({ now: new Date(FIXED_NOW) }),
    ]);
    const projected = projectCommercialAnalytics(pkg, []);

    expect(analytics.commercial.executive.mrr).toBe(overview.executive.mrr);
    expect(analytics.commercial.executive.commercialSubscribers).toBe(
      overview.executive.commercialSubscribers
    );
    expect(pkg.overviewReport.executive.mrr).toBe(overview.executive.mrr);
    expect(projected.commercial.executive.arr).toBe(overview.executive.arr);
    expect(projected.subscribers.every((r) => r.owner.id === 5)).toBe(true);
  });

  it("INTERNAL role=admin resolves NONE without ADMIN plan bypass", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      role: "admin",
      accountClassification: "INTERNAL",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const authority = await commercialReadService.getAuthorityForOwner(1, new Date(FIXED_NOW));

    expect(authority.planCode).toBe("NONE");
    expect(authority.commercialStatus.isEntitled).toBe(false);
  });
});
