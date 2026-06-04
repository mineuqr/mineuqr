import { describe, it, expect } from "vitest";
import { resolveSubscriptionForActivationFromRows } from "./subscriptionActivation";
import type { UserSubscriptionRow } from "./subscriptionResolver";

const FIXED_NOW = new Date("2026-05-15T12:00:00.000Z");

function isoPlusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function subRow(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId" | "restaurantId">
): UserSubscriptionRow {
  return {
    planId: 2,
    status: "trial",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: isoPlusDays(-10),
    currentPeriodEnd: isoPlusDays(10),
    trialEndsAt: isoPlusDays(10),
    canceledAt: null,
    createdAt: isoPlusDays(-30),
    updatedAt: isoPlusDays(-1),
    ...overrides,
  };
}

describe("resolveSubscriptionForActivationFromRows", () => {
  it("prefers explicit subscriptionId", () => {
    const rows = [
      subRow({ id: 1, userId: 9, restaurantId: 0, planId: 2 }),
      subRow({ id: 2, userId: 9, restaurantId: 5, planId: 3 }),
    ];
    expect(
      resolveSubscriptionForActivationFromRows(rows, { subscriptionId: 2 })?.id
    ).toBe(2);
  });

  it("prefers restaurant-scoped row when restaurantId is set", () => {
    const rows = [
      subRow({ id: 1, userId: 9, restaurantId: 0, planId: 2 }),
      subRow({ id: 2, userId: 9, restaurantId: 5, planId: 3 }),
    ];
    expect(
      resolveSubscriptionForActivationFromRows(rows, { restaurantId: 5 })?.id
    ).toBe(2);
  });

  it("prefers plan-matching row when planId is set", () => {
    const rows = [
      subRow({ id: 1, userId: 9, restaurantId: 0, planId: 2 }),
      subRow({ id: 2, userId: 9, restaurantId: 5, planId: 3 }),
    ];
    expect(
      resolveSubscriptionForActivationFromRows(rows, { planId: 3 })?.id
    ).toBe(2);
  });

  it("falls back to user-level row when planId is omitted", () => {
    const rows = [
      subRow({ id: 1, userId: 9, restaurantId: 0, planId: 2 }),
      subRow({ id: 2, userId: 9, restaurantId: 99, planId: 3 }),
    ];
    expect(
      resolveSubscriptionForActivationFromRows(rows)?.restaurantId
    ).toBe(0);
  });

  it("does not activate unrelated restaurant when only userId+planId from another venue", () => {
    const rows = [subRow({ id: 10, userId: 9, restaurantId: 99, planId: 3 })];
    expect(
      resolveSubscriptionForActivationFromRows(rows, { planId: 2 })
    ).toBeUndefined();
  });
});
