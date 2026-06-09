/**
 * ADMIN-UX-1E — reporting service validation & dashboard parity.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../../subscriptionResolver";
import {
  assertExportPackageReconciliation,
  commercialReportService,
} from "./CommercialReportService";
import { renderCommercialCsv } from "./adapters/CommercialCsvAdapter";
import { renderCommercialExport } from "./renderCommercialExport";

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

describe("ADMIN-UX-1E CommercialReportService", () => {
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
      userGrowth: [],
    });
    mockPopulationUsers([{ id: 5, name: "Owner", email: "owner@test.com", role: "user" }]);
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

  it("overview report matches getCommercialOverview snapshot", async () => {
    const caller = appRouter.createCaller(adminContext() as any);
    const [snapshot, pkg] = await Promise.all([
      caller.admin.getCommercialOverview({ now: FIXED_NOW }),
      commercialReportService.buildCommercialExportPackage({
        now: new Date(FIXED_NOW),
        generatedByUserId: 1,
      }),
    ]);

    expect(pkg.overviewReport.executive.mrr).toBe(snapshot.executive.mrr);
    expect(pkg.overviewReport.executive.arr).toBe(snapshot.executive.arr);
    expect(pkg.overviewReport.executive.commercialSubscribers).toBe(
      snapshot.executive.commercialSubscribers
    );
    expect(pkg.overviewReport.executive.activeTrials).toBe(snapshot.executive.activeTrials);
    expect(pkg.overviewReport.subscriptionHealth).toEqual(snapshot.subscriptionHealth);
    expect(pkg.overviewReport.needsAttention.expiringWithin30Days).toBe(
      snapshot.needsAttention.expiringWithin30Days
    );
    expect(pkg.envelope.dataAsOf).toBe(snapshot.asOf);
    assertExportPackageReconciliation(pkg);
  });

  it("CSV export contains same MRR and ARR as overview report", async () => {
    const pkg = await commercialReportService.buildCommercialExportPackage({
      now: new Date(FIXED_NOW),
    });
    const csv = renderCommercialCsv(pkg);
    expect(csv).toContain(`"MRR (USD)"`);
    expect(csv).toContain(`"${pkg.overviewReport.executive.mrr}"`);
    expect(csv).toContain(`"ARR (USD)"`);
    expect(csv).toContain(`"${pkg.overviewReport.executive.arr}"`);
    expect(csv).toContain(`"${pkg.overviewReport.executive.commercialSubscribers}"`);
  });

  it("all export formats render without alternate authority", async () => {
    const pkg = await commercialReportService.buildCommercialExportPackage({
      now: new Date(FIXED_NOW),
    });
    const csv = await renderCommercialExport(pkg, "csv");
    const xlsx = await renderCommercialExport(pkg, "xlsx");
    const pdf = await renderCommercialExport(pkg, "pdf");

    expect(csv.mimeType).toContain("csv");
    expect(xlsx.mimeType).toContain("spreadsheet");
    expect(pdf.mimeType).toBe("application/pdf");
    expect(csv.dataBase64.length).toBeGreaterThan(0);
    expect(xlsx.dataBase64.length).toBeGreaterThan(0);
    expect(pdf.dataBase64.length).toBeGreaterThan(0);
  });

  it("exportCommercialReport tRPC returns file payload", async () => {
    const caller = appRouter.createCaller(adminContext() as any);
    const file = await caller.admin.exportCommercialReport({
      format: "csv",
      now: FIXED_NOW,
    });
    expect(file.filename).toMatch(/commercial-overview-/);
    expect(file.dataBase64).toBeTruthy();
  });
});
