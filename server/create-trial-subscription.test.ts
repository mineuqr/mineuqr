import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  APP_TIMEZONE,
  periodEndInstantAfterCivilOffset,
} from "@shared/utils/timezone";
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
}));

vi.mock("./services/commercial-catalog", () => ({
  ensureCatalogReady: vi.fn(async () => undefined),
  resolveTrialPolicyFromCatalog: vi.fn(async () => ({
    professionalPlanId: "live-professional",
    legacyPlanId: 30002,
    durationDays: 14,
  })),
  resolveCanonicalLivePlanId: vi.fn(async () => "live-professional"),
  resolveLegacyPlanIdFromPlan: vi.fn(() => 30002),
  bindSubscriptionToLivePlan: vi.fn(),
}));

describe("create-trial-subscription (LAUNCH-5B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("resolveTrialPlanId", () => {
    it("assigns Professional Live Plan UUID, not Basic", async () => {
      await expect(resolveTrialPlanId()).resolves.toBe("live-professional");
    });

    it("fails closed when catalog trial policy has no Professional UUID", async () => {
      const catalog = await import("./services/commercial-catalog");
      vi.mocked(catalog.resolveTrialPolicyFromCatalog).mockResolvedValueOnce({
        professionalPlanId: null,
        legacyPlanId: 30002,
        durationDays: 14,
        trialPolicyId: null,
      });
      await expect(resolveTrialPlanId()).rejects.toThrow("trial_plan_unresolved");
    });
  });

  describe("buildTrialSubscriptionPayload", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
    });

    it("creates 14-day trial with Professional plan id", () => {
      const payload = buildTrialSubscriptionPayload(9, "live-professional", 55);
      expect(payload.planId).toBe("live-professional");
      expect(payload.status).toBe("trial");
      expect(payload.billingCycle).toBe("monthly");
      expect(payload.restaurantId).toBe(55);

      const trialEnd = new Date(payload.trialEndsAt!);
      const periodEnd = new Date(payload.currentPeriodEnd);
      const expected = periodEndInstantAfterCivilOffset({
        from: FIXED_NOW,
        timeZone: APP_TIMEZONE,
        days: TRIAL_DAYS,
      });

      expect(trialEnd.toISOString()).toBe(expected.toISOString());
      expect(trialEnd.getTime()).toBe(periodEnd.getTime());
      expect(payload.currentPeriodStart).toBe(FIXED_NOW.toISOString());
    });
  });
});
