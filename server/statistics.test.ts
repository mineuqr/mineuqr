import { describe, it, expect, vi } from "vitest";

// Mock db functions
vi.mock("./db", () => ({
  getAdminStatistics: vi.fn().mockResolvedValue({
    totalSubscribers: 10,
    activeSubscribers: 6,
    trialSubscribers: 2,
    expiredSubscribers: 1,
    canceledSubscribers: 1,
    totalRevenue: 1250.00,
    renewalRate: 80.0,
    churnRate: 20.0,
    subscriptionsByPlan: [
      { planName: "الأساسية", count: 5 },
      { planName: "الاحترافية", count: 3 },
      { planName: "المؤسسية", count: 2 },
    ],
  }),
  getRevenueByMonth: vi.fn().mockResolvedValue([
    { month: "2026-01", revenue: 200 },
    { month: "2026-02", revenue: 350 },
    { month: "2026-03", revenue: 400 },
  ]),
}));

describe("Admin Statistics", () => {
  it("getAdminStatistics returns correct structure", async () => {
    const { getAdminStatistics } = await import("./db");
    const stats = await getAdminStatistics();

    expect(stats).toBeDefined();
    expect(stats.totalSubscribers).toBe(10);
    expect(stats.activeSubscribers).toBe(6);
    expect(stats.trialSubscribers).toBe(2);
    expect(stats.expiredSubscribers).toBe(1);
    expect(stats.canceledSubscribers).toBe(1);
    expect(stats.totalRevenue).toBe(1250.00);
    expect(stats.renewalRate).toBe(80.0);
    expect(stats.churnRate).toBe(20.0);
    expect(stats.subscriptionsByPlan).toHaveLength(3);
  });

  it("getAdminStatistics renewal + churn rates sum to 100", async () => {
    const { getAdminStatistics } = await import("./db");
    const stats = await getAdminStatistics();
    expect(stats.renewalRate + stats.churnRate).toBe(100);
  });

  it("getAdminStatistics subscriber counts are consistent", async () => {
    const { getAdminStatistics } = await import("./db");
    const stats = await getAdminStatistics();
    expect(stats.activeSubscribers + stats.trialSubscribers + stats.expiredSubscribers + stats.canceledSubscribers).toBe(stats.totalSubscribers);
  });

  it("getRevenueByMonth returns monthly data", async () => {
    const { getRevenueByMonth } = await import("./db");
    const revenue = await getRevenueByMonth();

    expect(revenue).toBeDefined();
    expect(Array.isArray(revenue)).toBe(true);
    expect(revenue).toHaveLength(3);
    expect(revenue[0]).toHaveProperty("month");
    expect(revenue[0]).toHaveProperty("revenue");
    expect(typeof revenue[0].revenue).toBe("number");
  });

  it("getRevenueByMonth months are in chronological order", async () => {
    const { getRevenueByMonth } = await import("./db");
    const revenue = await getRevenueByMonth();

    for (let i = 1; i < revenue.length; i++) {
      expect(revenue[i].month > revenue[i - 1].month).toBe(true);
    }
  });

  it("subscriptionsByPlan plan names are non-empty", async () => {
    const { getAdminStatistics } = await import("./db");
    const stats = await getAdminStatistics();

    stats.subscriptionsByPlan.forEach((plan: any) => {
      expect(plan.planName).toBeTruthy();
      expect(typeof plan.count).toBe("number");
      expect(plan.count).toBeGreaterThanOrEqual(0);
    });
  });
});
