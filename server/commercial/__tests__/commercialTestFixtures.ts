import { afterEach, beforeEach, vi } from "vitest";
import type { UserSubscriptionRow } from "../../subscriptionResolver";
import { userHasSubscriptionEntitlement } from "../../subscriptionEntitlement";

/** Frozen clock anchor for commercial integration tests (subscription periods relative to this). */
export const COMMERCIAL_TEST_NOW = new Date("2026-06-01T12:00:00.000Z");

export const COMMERCIAL_PLAN_CATALOG = {
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
} as const;

export function isoPlusDaysFromCommercialTestNow(days: number): string {
  return new Date(
    COMMERCIAL_TEST_NOW.getTime() + days * 24 * 60 * 60 * 1000
  ).toISOString();
}

export function commercialTestSubRow(
  overrides: Partial<UserSubscriptionRow> &
    Pick<UserSubscriptionRow, "id" | "userId" | "restaurantId">
): UserSubscriptionRow {
  return {
    planId: "30002",
    status: "active",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: isoPlusDaysFromCommercialTestNow(-10),
    currentPeriodEnd: isoPlusDaysFromCommercialTestNow(20),
    trialEndsAt: null,
    canceledAt: null,
    createdAt: isoPlusDaysFromCommercialTestNow(-30),
    updatedAt: isoPlusDaysFromCommercialTestNow(-1),
    ...overrides,
  };
}

/** Pin Vitest time so router paths using `new Date()` match explicit `now` args. */
export function installCommercialTestClock(): void {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(COMMERCIAL_TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
}

export function legacyEntitlementActive(rows: UserSubscriptionRow[]): boolean {
  return userHasSubscriptionEntitlement(rows, COMMERCIAL_TEST_NOW);
}
