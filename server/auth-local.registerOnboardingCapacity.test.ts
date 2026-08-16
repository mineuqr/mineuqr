/**
 * COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommercialLimitExceededError } from "./subscription-runtime";
import { registerOwnerTransactional } from "./auth-local/registerOwner";
import { getDb, getUserByEmail, getUserByOpenId } from "./db";
import { assertOnboardingFirstRestaurantPermitted } from "./subscription-runtime/onboardingRestaurantCapacity";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./create-trial-subscription", () => ({
  buildTrialSubscriptionForUser: vi.fn(async (userId: number, restaurantId: number) => ({
    userId,
    restaurantId,
    planId: "plan-pro",
    status: "trial",
    billingCycle: "monthly",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date().toISOString(),
    trialEndsAt: new Date().toISOString(),
  })),
}));

vi.mock("./subscription-runtime/onboardingRestaurantCapacity", async () => {
  const actual = await vi.importActual<
    typeof import("./subscription-runtime/onboardingRestaurantCapacity")
  >("./subscription-runtime/onboardingRestaurantCapacity");
  return {
    ...actual,
    assertOnboardingFirstRestaurantPermitted: vi.fn(),
  };
});

const input = {
  restaurantName: "مطعم الاختبار",
  email: "owner@example.com",
  password: "password1",
};

describe("registerOwnerTransactional commercial onboarding invariant", () => {
  const transaction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserByEmail).mockResolvedValue(undefined as never);
    vi.mocked(getUserByOpenId).mockResolvedValue(undefined as never);
    vi.mocked(getDb).mockResolvedValue({ transaction } as never);
    vi.mocked(assertOnboardingFirstRestaurantPermitted).mockResolvedValue({
      allowed: true,
      reasonCode: "within_limit",
      limitKey: "restaurants",
      cap: 5,
      proposedTotal: 1,
      policy: "hard",
      source: "onboarding_trial_plan",
    });
  });

  it("does not open the onboarding transaction when restaurant cap is 0", async () => {
    vi.mocked(assertOnboardingFirstRestaurantPermitted).mockRejectedValue(
      new CommercialLimitExceededError("limit_exceeded", 0)
    );
    await expect(registerOwnerTransactional(input)).rejects.toMatchObject({
      code: "COMMERCIAL_LIMIT_EXCEEDED",
      reasonCode: "limit_exceeded",
      cap: 0,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("opens the onboarding transaction when the trial plan permits the first restaurant", async () => {
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        insert: () => ({
          values: async () => [{ insertId: 7 }],
        }),
      })
    );
    await expect(registerOwnerTransactional(input)).resolves.toEqual({
      userId: 7,
      openId: "local_owner@example.com",
      restaurantId: 7,
    });
    expect(assertOnboardingFirstRestaurantPermitted).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
