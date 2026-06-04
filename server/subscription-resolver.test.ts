import { describe, it, expect } from "vitest";
import {
  pickCanonicalSubscription,
  subscriptionEntitledNow,
  compareSubscriptionsCanonical,
  type UserSubscriptionRow,
} from "./subscriptionResolver";

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
    planId: 1,
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

describe("subscriptionResolver", () => {
  describe("subscriptionEntitledNow", () => {
    it("treats active row as entitled when currentPeriodEnd is in the future", () => {
      const row = subRow({ id: 1, userId: 1, restaurantId: 10 });
      expect(subscriptionEntitledNow(row, FIXED_NOW)).toBe(true);
    });

    it("treats active row as not entitled when currentPeriodEnd has passed", () => {
      const row = subRow({
        id: 1,
        userId: 1,
        restaurantId: 10,
        currentPeriodEnd: isoMinusDays(1),
      });
      expect(subscriptionEntitledNow(row, FIXED_NOW)).toBe(false);
    });
  });

  describe("pickCanonicalSubscription — single restaurant owner", () => {
    it("returns the only row for that restaurant", () => {
      const only = subRow({ id: 42, userId: 7, restaurantId: 100 });
      expect(pickCanonicalSubscription([only], FIXED_NOW)).toEqual(only);
    });
  });

  describe("pickCanonicalSubscription — multi-restaurant owner", () => {
    it("restaurant-specific sets pick the row for that restaurant only", () => {
      const forA = subRow({ id: 1, userId: 9, restaurantId: 201, status: "active" });
      const forB = subRow({
        id: 2,
        userId: 9,
        restaurantId: 202,
        status: "trial",
        trialEndsAt: isoPlusDays(5),
        currentPeriodEnd: isoMinusDays(1),
      });
      expect(pickCanonicalSubscription([forA], FIXED_NOW)?.restaurantId).toBe(201);
      expect(pickCanonicalSubscription([forB], FIXED_NOW)?.restaurantId).toBe(202);
    });
  });

  describe("pickCanonicalSubscription — active vs expired", () => {
    it("prefers entitled active over expired active for the same restaurant", () => {
      const expired = subRow({
        id: 1,
        userId: 3,
        restaurantId: 50,
        currentPeriodEnd: isoMinusDays(2),
      });
      const active = subRow({
        id: 2,
        userId: 3,
        restaurantId: 50,
        currentPeriodEnd: isoPlusDays(10),
      });
      const picked = pickCanonicalSubscription([expired, active], FIXED_NOW);
      expect(picked?.id).toBe(2);
    });

    it("prefers entitled trial over canceled row", () => {
      const canceled = subRow({
        id: 1,
        userId: 3,
        restaurantId: 50,
        status: "canceled",
        currentPeriodEnd: isoPlusDays(30),
      });
      const trial = subRow({
        id: 2,
        userId: 3,
        restaurantId: 50,
        status: "trial",
        trialEndsAt: isoPlusDays(7),
        currentPeriodEnd: isoPlusDays(7),
      });
      const picked = pickCanonicalSubscription([canceled, trial], FIXED_NOW);
      expect(picked?.id).toBe(2);
    });
  });

  describe("pickCanonicalSubscription — duplicate rows", () => {
    it("picks entitled row with later period end when both are active", () => {
      const shorter = subRow({
        id: 10,
        userId: 5,
        restaurantId: 88,
        currentPeriodEnd: isoPlusDays(5),
      });
      const longer = subRow({
        id: 11,
        userId: 5,
        restaurantId: 88,
        currentPeriodEnd: isoPlusDays(30),
      });
      const picked = pickCanonicalSubscription([shorter, longer], FIXED_NOW);
      expect(picked?.id).toBe(11);
    });

    it("breaks ties on period end with higher id (newer row)", () => {
      const older = subRow({
        id: 20,
        userId: 5,
        restaurantId: 88,
        currentPeriodEnd: isoPlusDays(30),
      });
      const newer = subRow({
        id: 21,
        userId: 5,
        restaurantId: 88,
        currentPeriodEnd: isoPlusDays(30),
      });
      const picked = pickCanonicalSubscription([older, newer], FIXED_NOW);
      expect(picked?.id).toBe(21);
    });
  });

  describe("deterministic ordering", () => {
    it("compareSubscriptionsCanonical is stable for the same inputs", () => {
      const a = subRow({ id: 3, userId: 1, restaurantId: 1 });
      const b = subRow({ id: 4, userId: 1, restaurantId: 1, currentPeriodEnd: isoPlusDays(40) });
      const first = compareSubscriptionsCanonical(a, b, FIXED_NOW);
      const second = compareSubscriptionsCanonical(a, b, FIXED_NOW);
      expect(first).toBe(second);
      expect(pickCanonicalSubscription([a, b], FIXED_NOW)?.id).toBe(4);
    });
  });
});
