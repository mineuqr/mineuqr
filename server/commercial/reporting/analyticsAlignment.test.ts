/**
 * ANALYTICS-ALIGNMENT-1 — analytics projection parity with certified commercial snapshot.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../../subscriptionResolver";
import { commercialReportService } from "./CommercialReportService";
import { projectCommercialAnalytics } from "./analyticsProjection";
import { assertExportPackageReconciliation } from "./CommercialReportService";

vi.mock("../../db", () => ({
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
} from "../../db";
import { appRouter } from "../../routers";

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
      id: 1,
      openId: "admin",
      name: "Admin",
      email: "admin@test.com",
      role: "admin" as const,
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

describe("ANALYTICS-ALIGNMENT-1 commercial analytics projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSubscriptionPlans as ReturnType<typeof vi.fn>).mockResolvedValue(
      Object.values(PLAN_CATALOG)
    );
    (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockImplementation(
      async (id: number) => PLAN_CATALOG[id as keyof typeof PLAN_CATALOG]
    );
    (getExtendedAdminStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalUsers: 1,
      totalRestaurants: 2,
      totalMenuItems: 10,
      totalCategories: 4,
      totalOffers: 1,
      userGrowth: [{ month: "2026-05", users: 1, restaurants: 1 }],
    });
    (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 5, name: "Owner", email: "owner@test.com", role: "user" },
    ]);
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, role: "user" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);
    const restaurantFixtures = [
      { id: 1, userId: 5, isActive: true },
      { id: 2, userId: 5, isActive: false },
    ];
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: async () => restaurantFixtures.filter((r) => r.isActive),
          then: (resolve: (v: unknown) => void) => resolve(restaurantFixtures),
        }),
      }),
    });
  });

  it("projection matches Commercial Overview snapshot at fixed asOf", async () => {
    const caller = appRouter.createCaller(adminContext() as any);
    const [snapshot, analytics] = await Promise.all([
      caller.admin.getCommercialOverview({ now: FIXED_NOW }),
      caller.admin.getCommercialAnalytics({ now: FIXED_NOW }),
    ]);

    expect(analytics.commercial.executive.mrr).toBe(snapshot.executive.mrr);
    expect(analytics.commercial.executive.arr).toBe(snapshot.executive.arr);
    expect(analytics.commercial.executive.commercialSubscribers).toBe(
      snapshot.executive.commercialSubscribers
    );
    expect(analytics.commercial.executive.activeTrials).toBe(snapshot.executive.activeTrials);
    expect(analytics.commercial.subscriptionHealth).toEqual(snapshot.subscriptionHealth);
    expect(analytics.commercial.needsAttention.expiringWithin30Days).toBe(
      snapshot.needsAttention.expiringWithin30Days
    );
    expect(analytics.dataAsOf).toBe(snapshot.asOf);
  });

  it("projection matches CommercialExportPackage overview report", async () => {
    const pkg = await commercialReportService.buildCommercialExportPackage({
      now: new Date(FIXED_NOW),
      generatedByUserId: 1,
    });
    assertExportPackageReconciliation(pkg);

    const analytics = projectCommercialAnalytics(pkg, [
      { month: "2026-05", users: 1, restaurants: 1 },
    ]);

    expect(analytics.commercial.executive).toEqual(pkg.overviewReport.executive);
    expect(analytics.commercial.subscriptionHealth).toEqual(
      pkg.overviewReport.subscriptionHealth
    );
    expect(analytics.commercial.planDistribution.entries).toEqual(
      pkg.overviewReport.planDistribution.entries
    );
    expect(analytics.platform).toEqual(pkg.operationalReport.counts);
    expect(analytics.snapshotFingerprint).toBe(pkg.snapshotFingerprint);
    expect(analytics.subscribers.length).toBe(pkg.subscriberReport.rows.length);
  });

  it("does not expose legacy renewal or revenue trend data", async () => {
    const caller = appRouter.createCaller(adminContext() as any);
    const analytics = await caller.admin.getCommercialAnalytics({ now: FIXED_NOW });

    expect(analytics.extensions.renewalRate.available).toBe(false);
    expect(analytics.extensions.revenueByMonth.available).toBe(false);
    expect(analytics.authority.source).toBe("S1_CANONICAL");
    expect(analytics.authority.assembler).toBe(
      "CanonicalMetricsService.getCommercialOverviewSnapshot"
    );
  });
});
