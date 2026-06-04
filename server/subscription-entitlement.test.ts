import { describe, it, expect } from "vitest";
import {
  resolveSubscriptionEntitlement,
  resolveTableOrderingEntitlement,
  userHasSubscriptionEntitlement,
  BASIC_FREE_PLAN_ID,
} from "./subscriptionEntitlement";
import type { UserSubscriptionRow } from "./subscriptionResolver";

const FIXED_NOW = new Date("2026-05-15T12:00:00.000Z");

function isoPlusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isoMinusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function subRow(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId" | "restaurantId">
): UserSubscriptionRow {
  return {
    planId: 2,
    status: "active",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: isoMinusDays(10),
    currentPeriodEnd: isoPlusDays(20),
    trialEndsAt: null,
    canceledAt: null,
    createdAt: isoMinusDays(30),
    updatedAt: isoMinusDays(1),
    ...overrides,
  };
}

describe("resolveSubscriptionEntitlement", () => {
  it("returns no_subscription when row is missing", () => {
    const result = resolveSubscriptionEntitlement(null, FIXED_NOW);
    expect(result).toEqual({
      isEntitled: false,
      reason: "no_subscription",
      status: null,
      source: "none",
    });
  });

  it("entitles active row with future currentPeriodEnd", () => {
    const row = subRow({ id: 1, userId: 1, restaurantId: 0 });
    const result = resolveSubscriptionEntitlement(row, FIXED_NOW);
    expect(result.isEntitled).toBe(true);
    expect(result.reason).toBe("entitled");
  });

  it("rejects active row with expired currentPeriodEnd", () => {
    const row = subRow({
      id: 1,
      userId: 1,
      restaurantId: 0,
      currentPeriodEnd: isoMinusDays(1),
    });
    const result = resolveSubscriptionEntitlement(row, FIXED_NOW);
    expect(result.isEntitled).toBe(false);
    expect(result.reason).toBe("period_expired");
  });

  it("entitles trial row with future trialEndsAt", () => {
    const row = subRow({
      id: 2,
      userId: 1,
      restaurantId: 0,
      status: "trial",
      trialEndsAt: isoPlusDays(7),
      currentPeriodEnd: isoPlusDays(7),
    });
    expect(resolveSubscriptionEntitlement(row, FIXED_NOW).isEntitled).toBe(true);
  });

  it("rejects trial without trialEndsAt", () => {
    const row = subRow({
      id: 3,
      userId: 1,
      restaurantId: 0,
      status: "trial",
      trialEndsAt: null,
    });
    expect(resolveSubscriptionEntitlement(row, FIXED_NOW).reason).toBe("missing_trial_end");
  });

  it("rejects canceled status regardless of dates", () => {
    const row = subRow({
      id: 4,
      userId: 1,
      restaurantId: 0,
      status: "canceled",
      currentPeriodEnd: isoPlusDays(30),
    });
    expect(resolveSubscriptionEntitlement(row, FIXED_NOW).reason).toBe("status_not_entitled");
  });
});

describe("resolveTableOrderingEntitlement", () => {
  it("requires period-valid subscription and non-basic plan", () => {
    const row = subRow({ id: 1, userId: 1, restaurantId: 10 });
    const entitled = resolveTableOrderingEntitlement(row, { id: 2 }, FIXED_NOW);
    expect(entitled.isEntitled).toBe(true);

    const basic = resolveTableOrderingEntitlement(row, { id: BASIC_FREE_PLAN_ID }, FIXED_NOW);
    expect(basic.isEntitled).toBe(false);
    expect(basic.reason).toBe("plan_basic_free");

    const expired = resolveTableOrderingEntitlement(
      subRow({ id: 2, userId: 1, restaurantId: 10, currentPeriodEnd: isoMinusDays(2) }),
      { id: 2 },
      FIXED_NOW
    );
    expect(expired.isEntitled).toBe(false);
    expect(expired.reason).toBe("period_expired");
  });

  it("rejects when plan is missing", () => {
    const row = subRow({ id: 1, userId: 1, restaurantId: 10 });
    const result = resolveTableOrderingEntitlement(row, null, FIXED_NOW);
    expect(result.reason).toBe("plan_not_found");
  });
});

describe("userHasSubscriptionEntitlement", () => {
  it("returns true if any row is entitled (multi-restaurant)", () => {
    const expired = subRow({
      id: 1,
      userId: 5,
      restaurantId: 1,
      currentPeriodEnd: isoMinusDays(5),
    });
    const active = subRow({ id: 2, userId: 5, restaurantId: 2 });
    expect(userHasSubscriptionEntitlement([expired, active], FIXED_NOW)).toBe(true);
  });

  it("returns false when no rows are entitled", () => {
    const expired = subRow({
      id: 1,
      userId: 5,
      restaurantId: 0,
      currentPeriodEnd: isoMinusDays(1),
    });
    expect(userHasSubscriptionEntitlement([expired], FIXED_NOW)).toBe(false);
  });
});
