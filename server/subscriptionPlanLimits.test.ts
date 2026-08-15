import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  getRestaurantsByUser: vi.fn(),
  getRestaurantStats: vi.fn(),
}));

vi.mock("./subscription-runtime", () => ({
  checkLimit: vi.fn(),
  resolveOwnerEntitlements: vi.fn(),
}));

import { getRestaurantsByUser, getRestaurantStats } from "./db";
import { checkLimit, resolveOwnerEntitlements } from "./subscription-runtime";
import {
  assertCategoryCreateAllowed,
  assertMenuItemCreateAllowed,
  assertRestaurantCreateAllowed,
  resolvePlanLimitsForUser,
} from "./subscriptionPlanLimits";

describe("subscriptionPlanLimits hub authority", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantsByUser).mockReset();
    vi.mocked(getRestaurantStats).mockReset();
    vi.mocked(checkLimit).mockReset();
    vi.mocked(resolveOwnerEntitlements).mockReset();
  });

  it("reads restaurant quota from the entitlement hub, not PLAN_LIMITS", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue({
      entitlements: { limits: { restaurants: 5, items: 500, categories: 25 } },
    } as never);
    const limits = await resolvePlanLimitsForUser(9);
    expect(limits.maxRestaurants).toBe(5);
    expect(resolveOwnerEntitlements).toHaveBeenCalledWith(9);
  });

  it("maps hub null to unlimited quota", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue({
      entitlements: { limits: { restaurants: null, items: null, categories: null } },
    } as never);
    const limits = await resolvePlanLimitsForUser(9);
    expect(limits.maxRestaurants).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("NONE / never-subscribed resolves to zero, not Basic 1", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue({
      entitlements: { limits: { restaurants: 0, items: 0, categories: 0 } },
    } as never);
    const limits = await resolvePlanLimitsForUser(9);
    expect(limits.maxRestaurants).toBe(0);
  });

  it("allows first Basic restaurant and denies the second", async () => {
    vi.mocked(getRestaurantsByUser).mockResolvedValue([]);
    vi.mocked(checkLimit).mockResolvedValue({ allowed: true, cap: 1 } as never);
    await expect(assertRestaurantCreateAllowed(9)).resolves.toBeUndefined();

    vi.mocked(getRestaurantsByUser).mockResolvedValue([{ id: 1 }]);
    vi.mocked(checkLimit).mockResolvedValue({
      allowed: false,
      cap: 1,
      reasonCode: "limit_exceeded",
    } as never);
    await expect(assertRestaurantCreateAllowed(9)).rejects.toBeInstanceOf(TRPCError);
    expect(checkLimit).toHaveBeenCalledWith({
      ownerId: 9,
      limitKey: "restaurants",
      proposedTotal: 2,
    });
  });

  it("does not treat admin role as a grant — caller must still checkLimit", async () => {
    vi.mocked(getRestaurantsByUser).mockResolvedValue([{ id: 1 }]);
    vi.mocked(checkLimit).mockResolvedValue({
      allowed: false,
      cap: 1,
    } as never);
    await expect(assertRestaurantCreateAllowed(9)).rejects.toBeInstanceOf(TRPCError);
  });

  it("allows create when hub says unlimited", async () => {
    vi.mocked(getRestaurantsByUser).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    vi.mocked(checkLimit).mockResolvedValue({
      allowed: true,
      cap: null,
      policy: "unlimited",
    } as never);
    await expect(assertRestaurantCreateAllowed(9)).resolves.toBeUndefined();
  });

  it("enforces category and item limits through the hub", async () => {
    vi.mocked(getRestaurantStats).mockResolvedValue({
      totalCategories: 10,
      totalItems: 100,
    } as never);
    vi.mocked(checkLimit).mockResolvedValue({ allowed: false, cap: 10 } as never);
    await expect(assertCategoryCreateAllowed(9, 3)).rejects.toBeInstanceOf(TRPCError);
    vi.mocked(checkLimit).mockResolvedValue({ allowed: false, cap: 100 } as never);
    await expect(assertMenuItemCreateAllowed(9, 3)).rejects.toBeInstanceOf(TRPCError);
  });
});
