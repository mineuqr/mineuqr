import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  assertCategoryCreateAllowed,
  assertMenuItemCreateAllowed,
  assertRestaurantCreateAllowed,
  resolvePlanLimitsForUser,
} from "./subscriptionPlanLimits";

vi.mock("./db", () => ({
  getRestaurantsByUser: vi.fn(),
  getRestaurantStats: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
}));

vi.mock("./services/commercial-catalog", () => ({
  getSubscriptionCommercialBinding: vi.fn(async () => null),
  resolveLivePlanCapabilities: vi.fn(async () => ({
    source: "missing",
    planId: null,
    catalogPlanCode: null,
    featureKeys: [],
    limits: [],
    chargedTerms: null,
  })),
}));

vi.mock("./subscriptionEntitlement", () => ({
  resolveSubscriptionEntitlement: vi.fn(() => ({ isEntitled: true })),
}));

import {
  getRestaurantsByUser,
  getRestaurantStats,
  getSubscriptionsByUser,
  getSubscriptionPlanById,
  getSubscriptionPlans,
} from "./db";

const basicPlan = {
  maxRestaurants: 1,
  maxItemsPerRestaurant: 100,
  maxCategories: 10,
};

const proPlan = {
  maxRestaurants: 5,
  maxItemsPerRestaurant: 500,
  maxCategories: 25,
};

const enterprisePlan = {
  maxRestaurants: 999,
  maxItemsPerRestaurant: 9999,
  maxCategories: 100,
};

describe("subscriptionPlanLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSubscriptionPlans as any).mockResolvedValue([
      { id: 1, ...basicPlan },
      { id: 2, ...proPlan },
      { id: 3, ...enterprisePlan },
    ]);
  });

  describe("resolvePlanLimitsForUser", () => {
    it("uses entitled subscription plan limits", async () => {
      (getSubscriptionsByUser as any).mockResolvedValue([
        { id: 1, userId: 9, restaurantId: 0, planId: 2, status: "active" },
      ]);
      (getSubscriptionPlanById as any).mockResolvedValue({ id: 2, ...proPlan });

      const limits = await resolvePlanLimitsForUser(9);
      expect(limits.maxRestaurants).toBe(5);
    });

    it("falls back to basic when no subscription", async () => {
      (getSubscriptionsByUser as any).mockResolvedValue([]);

      const limits = await resolvePlanLimitsForUser(9);
      expect(limits.maxRestaurants).toBe(1);
    });
  });

  describe("assertRestaurantCreateAllowed", () => {
    it("allows create when under Basic limit", async () => {
      (getRestaurantsByUser as any).mockResolvedValue([]);
      (getSubscriptionsByUser as any).mockResolvedValue([
        { id: 1, userId: 9, restaurantId: 0, planId: 1, status: "active" },
      ]);
      (getSubscriptionPlanById as any).mockResolvedValue({ id: 1, ...basicPlan });

      await expect(assertRestaurantCreateAllowed(9)).resolves.toBeUndefined();
    });

    it("rejects when Basic limit reached", async () => {
      (getRestaurantsByUser as any).mockResolvedValue([{ id: 1 }]);
      (getSubscriptionsByUser as any).mockResolvedValue([
        { id: 1, userId: 9, restaurantId: 0, planId: 1, status: "active" },
      ]);
      (getSubscriptionPlanById as any).mockResolvedValue({ id: 1, ...basicPlan });

      await expect(assertRestaurantCreateAllowed(9)).rejects.toThrow(TRPCError);
    });

    it("allows fifth restaurant on Professional", async () => {
      (getRestaurantsByUser as any).mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ]);
      (getSubscriptionsByUser as any).mockResolvedValue([
        { id: 1, userId: 9, restaurantId: 0, planId: 2, status: "active" },
      ]);
      (getSubscriptionPlanById as any).mockResolvedValue({ id: 2, ...proPlan });

      await expect(assertRestaurantCreateAllowed(9)).resolves.toBeUndefined();
    });
  });

  describe("assertCategoryCreateAllowed", () => {
    it("rejects when category limit reached", async () => {
      (getSubscriptionsByUser as any).mockResolvedValue([
        { id: 1, userId: 9, restaurantId: 3, planId: 1, status: "active" },
      ]);
      (getSubscriptionPlanById as any).mockResolvedValue({ id: 1, ...basicPlan });
      (getRestaurantStats as any).mockResolvedValue({
        totalCategories: 10,
        totalItems: 0,
        viewCount: 0,
      });

      await expect(assertCategoryCreateAllowed(9, 3)).rejects.toThrow(TRPCError);
    });
  });

  describe("assertMenuItemCreateAllowed", () => {
    it("rejects when item limit reached", async () => {
      (getSubscriptionsByUser as any).mockResolvedValue([
        { id: 1, userId: 9, restaurantId: 3, planId: 1, status: "active" },
      ]);
      (getSubscriptionPlanById as any).mockResolvedValue({ id: 1, ...basicPlan });
      (getRestaurantStats as any).mockResolvedValue({
        totalCategories: 1,
        totalItems: 100,
        viewCount: 0,
      });

      await expect(assertMenuItemCreateAllowed(9, 3)).rejects.toThrow(TRPCError);
    });
  });
});
