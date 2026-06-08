import { describe, expect, it } from "vitest";
import { mapDashboardSummaryToKPIs } from "./dashboardSummaryKpis";

describe("mapDashboardSummaryToKPIs", () => {
  it("maps canonical dashboard summary without client derivation", () => {
    const kpis = mapDashboardSummaryToKPIs({
      activeRestaurants: 3,
      activeSubscriptions: 2,
      expiringAccounts: 1,
      mrr: 79,
      totalUsers: 5,
    });
    expect(kpis).toEqual({
      activeRestaurants: 3,
      activeSubscriptions: 2,
      expiringSoon: 1,
      estimatedMrr: 79,
      totalUsers: 5,
    });
  });

  it("defaults missing fields to zero", () => {
    expect(mapDashboardSummaryToKPIs(undefined)).toEqual({
      activeRestaurants: 0,
      activeSubscriptions: 0,
      expiringSoon: 0,
      estimatedMrr: 0,
      totalUsers: 0,
    });
  });
});
