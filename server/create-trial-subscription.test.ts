import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  TRIAL_DAYS,
  TRIAL_PLAN_SORT_ORDER,
  buildTrialSubscriptionPayload,
  resolveTrialPlanId,
} from "./create-trial-subscription";

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

  describe("resolveTrialPlanId", () => {
    it("assigns Professional plan (sortOrder 2), not Basic", async () => {
      await expect(resolveTrialPlanId()).resolves.toBe(102);
    });
  });

  describe("buildTrialSubscriptionPayload", () => {
    it("creates 14-day trial with Professional plan id", () => {
      const payload = buildTrialSubscriptionPayload(9, 102, 55);
      expect(payload.planId).toBe(102);
      expect(payload.status).toBe("trial");
      expect(payload.billingCycle).toBe("monthly");
      expect(payload.restaurantId).toBe(55);

      const trialEnd = new Date(payload.trialEndsAt!);
      const periodEnd = new Date(payload.currentPeriodEnd);
      const expected = new Date();
      expected.setDate(expected.getDate() + TRIAL_DAYS);

      expect(
        Math.abs(trialEnd.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)
      ).toBeLessThan(0.1);
      expect(trialEnd.toISOString()).toBe(periodEnd.toISOString());
    });
  });
});
