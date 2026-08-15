import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  TRIAL_DAYS,
  TRIAL_PLAN_SORT_ORDER,
  buildTrialSubscriptionPayload,
  resolveTrialPlanId,
} from "./create-trial-subscription";

/** Frozen clock so separate `new Date()` calls in payload builder share one instant. */
const FIXED_NOW = new Date("2026-06-08T12:00:00.000Z");

vi.mock("./db", () => ({
  createUserSubscription: vi.fn(),
  getSubscriptionPlans: vi.fn(async () => [
    {
      id: 30001,
      nameEn: "Ordering Free",
      sortOrder: 0,
      maxRestaurants: 1,
      isActive: true,
    },
    {
      id: 101,
      nameEn: "Basic Plan",
      sortOrder: 1,
      maxRestaurants: 1,
      isActive: true,
    },
    {
      id: 102,
      nameEn: "Professional Plan",
      sortOrder: 2,
      maxRestaurants: 5,
      isActive: true,
    },
    {
      id: 103,
      nameEn: "Enterprise Plan",
      sortOrder: 3,
      maxRestaurants: 999,
      isActive: true,
    },
  ]),
}));

describe("create-trial-subscription (LAUNCH-5B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("resolveTrialPlanId", () => {
    it("assigns Professional compatibility id, not Basic", async () => {
      await expect(resolveTrialPlanId()).resolves.toBe(30002);
    });
  });

  describe("buildTrialSubscriptionPayload", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
    });

    it("creates 14-day trial with Professional plan id", () => {
      const payload = buildTrialSubscriptionPayload(9, 102, 55);
      expect(payload.planId).toBe(102);
      expect(payload.status).toBe("trial");
      expect(payload.billingCycle).toBe("monthly");
      expect(payload.restaurantId).toBe(55);

      const trialEnd = new Date(payload.trialEndsAt!);
      const periodEnd = new Date(payload.currentPeriodEnd);
      const expected = new Date(FIXED_NOW);
      expected.setDate(expected.getDate() + TRIAL_DAYS);

      expect(
        Math.abs(trialEnd.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)
      ).toBeLessThan(0.1);
      expect(trialEnd.getTime()).toBe(periodEnd.getTime());
      expect(payload.currentPeriodStart).toBe(FIXED_NOW.toISOString());
    });
  });
});
