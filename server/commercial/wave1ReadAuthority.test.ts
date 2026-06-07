import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../subscriptionResolver";

vi.mock("../db", () => ({
  getTrialEndDate: vi.fn(),
  isSubscriptionActive: vi.fn(),
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
}));

vi.mock("./getCommercialEntitlements", () => ({
  getCommercialEntitlements: vi.fn(),
}));

import { getTrialEndDate, isSubscriptionActive } from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";
import { resolveTrialStatusRead } from "./wave1ReadAuthority";

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
