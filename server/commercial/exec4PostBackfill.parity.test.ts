/**
 * EXEC-4E — post-backfill CRS validation (mocked DB, read-only).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../subscriptionResolver";

vi.mock("../db", () => ({
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
}));

import {
  getSubscriptionPlanById,
  getSubscriptionsByUser,
  getUserById,
} from "../db";
import { commercialReadService } from "./CommercialReadService";

const PLAN_CATALOG = {
  30001: { id: 30001, nameEn: "Basic", nameAr: "أساسي", maxRestaurants: 1, maxItemsPerRestaurant: 100, maxCategories: 10, priceMonthly: "29.00", priceYearly: "290.00" },
  30002: { id: 30002, nameEn: "Professional", nameAr: "احترافي", maxRestaurants: 5, maxItemsPerRestaurant: 500, maxCategories: 25, priceMonthly: "79.00", priceYearly: "790.00" },
};

function subRow(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId" | "restaurantId">
): UserSubscriptionRow {
  return {
    planId: 30002,
    status: "active",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: "2026-06-07T16:45:56.000Z",
    currentPeriodEnd: "2027-06-07T16:45:56.000Z",
    trialEndsAt: null,
    canceledAt: null,
    createdAt: "2026-06-07T16:45:56.000Z",
    updatedAt: "2026-06-07T16:45:56.000Z",
    ...overrides,
  };
}

/** Simulated post-EXEC-4 launch DB state. */
const POST_BACKFILL_STATE: Record<number, UserSubscriptionRow[]> = {
  1: [
    subRow({ id: 600001, userId: 1, restaurantId: 0, planId: 30001 }),
  ],
  14760004: [
    subRow({ id: 700001, userId: 14760004, restaurantId: 0, planId: 30002 }),
    subRow({ id: 600002, userId: 14760004, restaurantId: 720006, planId: 30002, status: "expired" }),
    subRow({ id: 630001, userId: 14760004, restaurantId: 720003, planId: 30001, status: "expired" }),
    subRow({ id: 630002, userId: 14760004, restaurantId: 720005, planId: 30001, status: "expired" }),
  ],
};

describe("EXEC-4E post-backfill CRS validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockImplementation(
      async (id: number) => PLAN_CATALOG[id as keyof typeof PLAN_CATALOG]
    );
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(
      async (userId: number) => POST_BACKFILL_STATE[userId] ?? []
    );
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => ({
      id,
      role: id === 1 ? "admin" : "user",
    }));
  });

  it("user 14760004 resolves PROFESSIONAL via account row (not NONE)", async () => {
    const state = await commercialReadService.getOwnerCommercialState(14760004);
    expect(state.planCode).toBe("PROFESSIONAL");
    expect(state.subscriptionStatus).toBe("active");
    expect(state.authoritySource).toBe("S1_CANONICAL");
    expect(state.commercialStatus.isEntitled).toBe(true);
  });

  it("user 1 admin still resolves ADMIN via role bypass with account row present", async () => {
    const state = await commercialReadService.getOwnerCommercialState(1);
    expect(state.planCode).toBe("ADMIN");
    expect(state.authoritySource).toBe("S1_CANONICAL");
  });

  it("pickUserLevelSubscription ignores expired scoped rows", async () => {
    const state = await commercialReadService.getOwnerCommercialState(14760004);
    expect(state.subscriptionId).toBe(700001);
    expect(state.planCode).not.toBe("NONE");
  });
});
