/**
 * COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
} from "../commercialLimitOccupancy";
import {
  assertOnboardingFirstRestaurantPermitted,
  decideOnboardingRestaurantCapacity,
  resolveOnboardingRestaurantCapacity,
} from "../onboardingRestaurantCapacity";

const resolveTrialPolicyFromCatalog = vi.fn();
const listLivePlanOfferings = vi.fn();

vi.mock("../../services/commercial-catalog", () => ({
  resolveTrialPolicyFromCatalog: (...args: unknown[]) =>
    resolveTrialPolicyFromCatalog(...args),
  listLivePlanOfferings: (...args: unknown[]) => listLivePlanOfferings(...args),
}));

describe("decideOnboardingRestaurantCapacity", () => {
  it("allows first restaurant when the trial plan restaurants cap is >= 1", () => {
    expect(
      decideOnboardingRestaurantCapacity({
        cap: 1,
        restaurantsKeyPresent: true,
        proposedTotal: 1,
      })
    ).toMatchObject({
      allowed: true,
      reasonCode: "within_limit",
      cap: 1,
      proposedTotal: 1,
      policy: "hard",
    });
    expect(
      decideOnboardingRestaurantCapacity({
        cap: 5,
        restaurantsKeyPresent: true,
        proposedTotal: 1,
      }).allowed
    ).toBe(true);
  });

  it("fails closed when restaurants cap is 0", () => {
    expect(
      decideOnboardingRestaurantCapacity({
        cap: 0,
        restaurantsKeyPresent: true,
        proposedTotal: 1,
      })
    ).toMatchObject({
      allowed: false,
      reasonCode: "limit_exceeded",
      cap: 0,
      proposedTotal: 1,
      policy: "hard",
    });
  });

  it("fails closed when the restaurants limit is missing", () => {
    expect(
      decideOnboardingRestaurantCapacity({
        cap: undefined,
        restaurantsKeyPresent: false,
        proposedTotal: 1,
      })
    ).toMatchObject({
      allowed: false,
      reasonCode: "limit_unavailable",
      policy: "denied",
    });
  });

  it("does not treat a missing key as unlimited", () => {
    const decision = decideOnboardingRestaurantCapacity({
      cap: null,
      restaurantsKeyPresent: false,
      proposedTotal: 1,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("limit_unavailable");
  });

  it("allows first restaurant when the restaurants key is present and unlimited", () => {
    expect(
      decideOnboardingRestaurantCapacity({
        cap: null,
        restaurantsKeyPresent: true,
        proposedTotal: 1,
      })
    ).toMatchObject({
      allowed: true,
      reasonCode: "unlimited",
      cap: null,
      policy: "unlimited",
    });
  });

  it("fails closed for invalid cap values", () => {
    for (const cap of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        decideOnboardingRestaurantCapacity({
          cap,
          restaurantsKeyPresent: true,
          proposedTotal: 1,
        }).allowed
      ).toBe(false);
    }
  });

  it("respects existing occupancy via proposedTotal", () => {
    expect(
      decideOnboardingRestaurantCapacity({
        cap: 1,
        restaurantsKeyPresent: true,
        proposedTotal: 2,
      })
    ).toMatchObject({
      allowed: false,
      reasonCode: "limit_exceeded",
      cap: 1,
      proposedTotal: 2,
    });
  });

  it("does not hard-code restaurants = 1 as the required cap", () => {
    expect(
      decideOnboardingRestaurantCapacity({
        cap: 3,
        restaurantsKeyPresent: true,
        proposedTotal: 1,
      }).allowed
    ).toBe(true);
  });
});

describe("resolveOnboardingRestaurantCapacity", () => {
  beforeEach(() => {
    resolveTrialPolicyFromCatalog.mockReset();
    listLivePlanOfferings.mockReset();
  });

  it("reads the trial plan restaurants cap without defaulting missing to 1", async () => {
    resolveTrialPolicyFromCatalog.mockResolvedValue({
      professionalPlanId: "plan-pro",
      durationDays: 14,
      trialPolicyId: "trial",
    });
    listLivePlanOfferings.mockResolvedValue([
      {
        planId: "plan-pro",
        planCode: "professional",
        limits: [{ limitKey: "categories", value: 10, unit: "count" }],
      },
    ]);
    await expect(resolveOnboardingRestaurantCapacity()).resolves.toMatchObject({
      allowed: false,
      reasonCode: "limit_unavailable",
    });
  });

  it("fails closed when the trial plan cannot be resolved", async () => {
    resolveTrialPolicyFromCatalog.mockResolvedValue({
      professionalPlanId: null,
      durationDays: 14,
      trialPolicyId: null,
    });
    await expect(assertOnboardingFirstRestaurantPermitted()).rejects.toBeInstanceOf(
      CommercialOccupancyUnavailableError
    );
    expect(listLivePlanOfferings).not.toHaveBeenCalled();
  });

  it("fails closed when catalog lookup throws", async () => {
    resolveTrialPolicyFromCatalog.mockRejectedValue(new Error("catalog down"));
    await expect(assertOnboardingFirstRestaurantPermitted()).rejects.toBeInstanceOf(
      CommercialOccupancyUnavailableError
    );
  });

  it("throws CommercialLimitExceededError when cap is 0", async () => {
    resolveTrialPolicyFromCatalog.mockResolvedValue({
      professionalPlanId: "plan-pro",
      durationDays: 14,
      trialPolicyId: "trial",
    });
    listLivePlanOfferings.mockResolvedValue([
      {
        planId: "plan-pro",
        planCode: "professional",
        limits: [{ limitKey: "restaurants", value: 0, unit: "count" }],
      },
    ]);
    await expect(assertOnboardingFirstRestaurantPermitted()).rejects.toMatchObject({
      code: "COMMERCIAL_LIMIT_EXCEEDED",
      reasonCode: "limit_exceeded",
      cap: 0,
    });
    expect(CommercialLimitExceededError).toBeDefined();
  });

  it("permits bootstrap Professional cap >= 1", async () => {
    resolveTrialPolicyFromCatalog.mockResolvedValue({
      professionalPlanId: "plan-pro",
      durationDays: 14,
      trialPolicyId: "trial",
    });
    listLivePlanOfferings.mockResolvedValue([
      {
        planId: "plan-a",
        planCode: "basic",
        limits: [{ limitKey: "restaurants", value: 0, unit: "count" }],
      },
      {
        planId: "plan-pro",
        planCode: "professional",
        limits: [{ limitKey: "restaurants", value: 5, unit: "count" }],
      },
    ]);
    await expect(assertOnboardingFirstRestaurantPermitted()).resolves.toMatchObject({
      allowed: true,
      cap: 5,
      reasonCode: "within_limit",
    });
  });

  it("does not use another tenant's plan offering when ids differ", async () => {
    resolveTrialPolicyFromCatalog.mockResolvedValue({
      professionalPlanId: "plan-pro",
      durationDays: 14,
      trialPolicyId: "trial",
    });
    listLivePlanOfferings.mockResolvedValue([
      {
        planId: "plan-other",
        planCode: "professional",
        limits: [{ limitKey: "restaurants", value: 5, unit: "count" }],
      },
    ]);
    await expect(assertOnboardingFirstRestaurantPermitted()).rejects.toBeInstanceOf(
      CommercialOccupancyUnavailableError
    );
  });
});
