import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../subscriptionResolver";

vi.mock("../db", () => ({
  getRestaurantById: vi.fn(),
  getTrialEndDate: vi.fn(),
  isSubscriptionActive: vi.fn(),
  restaurantAllowsTableOrdering: vi.fn(),
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
}));

vi.mock("./getCommercialEntitlements", () => ({
  getCommercialEntitlements: vi.fn(),
}));

import {
  getRestaurantById,
  getTrialEndDate,
  isSubscriptionActive,
  restaurantAllowsTableOrdering,
} from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";
import { resolveCanOrderRead, resolveTrialStatusRead } from "./wave1ReadAuthority";

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");
const TRIAL_END = new Date("2026-06-15T12:00:00.000Z");

describe("resolveTrialStatusRead (PG-1C.4C Wave 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses entitlements plan when account-level subscription exists", async () => {
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      context: {
        subscription: { trialEndsAt: TRIAL_END.toISOString() },
      },
      entitlements: { plan: "TRIAL" },
    });
    (isSubscriptionActive as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await resolveTrialStatusRead(1, FIXED_NOW);

    expect(result.isActive).toBe(true);
    expect(result.trialEndDate).toEqual(TRIAL_END);
    expect(isSubscriptionActive).not.toHaveBeenCalled();
  });

  it("falls back to legacy isActive when plan is NONE but restaurant-scoped row is entitled", async () => {
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      context: { subscription: null },
      entitlements: { plan: "NONE" },
    });
    (isSubscriptionActive as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getTrialEndDate as ReturnType<typeof vi.fn>).mockResolvedValue(TRIAL_END);

    const result = await resolveTrialStatusRead(7, FIXED_NOW);

    expect(result.isActive).toBe(true);
    expect(result.trialEndDate).toEqual(TRIAL_END);
    expect(isSubscriptionActive).toHaveBeenCalledWith(7);
    expect(getTrialEndDate).toHaveBeenCalledWith(7);
  });

  it("returns inactive when NONE and legacy inactive", async () => {
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      context: { subscription: null },
      entitlements: { plan: "NONE" },
    });
    (isSubscriptionActive as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (getTrialEndDate as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await resolveTrialStatusRead(9, FIXED_NOW);

    expect(result.isActive).toBe(false);
    expect(result.trialEndDate).toBeNull();
  });
});

describe("resolveCanOrderRead (PG-1C.4C Wave 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses legacy only when owner entitlements plan is NONE", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      entitlements: { plan: "NONE", features: { ordering: false } },
    });
    (restaurantAllowsTableOrdering as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await resolveCanOrderRead(10, FIXED_NOW);

    expect(result.canOrder).toBe(true);
  });

  it("returns false when NONE and legacy denies", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      entitlements: { plan: "NONE", features: { ordering: false } },
    });
    (restaurantAllowsTableOrdering as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    expect((await resolveCanOrderRead(10, FIXED_NOW)).canOrder).toBe(false);
  });

  it("combines legacy and entitlements when account-level plan exists", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      entitlements: { plan: "BASIC", features: { ordering: false } },
    });
    (restaurantAllowsTableOrdering as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    expect((await resolveCanOrderRead(10, FIXED_NOW)).canOrder).toBe(true);
  });

  it("allows ordering from entitlements when account-level professional", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10,
      userId: 5,
    });
    (getCommercialEntitlements as ReturnType<typeof vi.fn>).mockResolvedValue({
      entitlements: { plan: "PROFESSIONAL", features: { ordering: true } },
    });
    (restaurantAllowsTableOrdering as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    expect((await resolveCanOrderRead(10, FIXED_NOW)).canOrder).toBe(true);
  });

  it("returns false when restaurant not found", async () => {
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    expect((await resolveCanOrderRead(999, FIXED_NOW)).canOrder).toBe(false);
  });
});
