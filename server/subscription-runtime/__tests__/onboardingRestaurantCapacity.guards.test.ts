/**
 * COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("onboarding restaurant occupancy invariant guards", () => {
  it("asserts trial restaurant capacity before the first restaurant insert", () => {
    const register = read("server/auth-local/registerOwner.ts");
    const assertAt = register.indexOf("assertOnboardingFirstRestaurantPermitted");
    const insertAt = register.indexOf("tx.insert(restaurants)");
    expect(assertAt).toBeGreaterThan(0);
    expect(insertAt).toBeGreaterThan(assertAt);
    expect(register).not.toContain("withCommercialLimitOccupancy");
    expect(register).not.toContain("?? 1");
    expect(register).not.toContain("GET_LOCK");
    expect(register).not.toContain("PosOccupancyService");
  });

  it("keeps Commercial ownership of the onboarding capacity decision", () => {
    const capacity = read(
      "server/subscription-runtime/onboardingRestaurantCapacity.ts"
    );
    const occupancy = read(
      "server/subscription-runtime/commercialLimitOccupancy.ts"
    );
    expect(capacity).toContain("decideOnboardingRestaurantCapacity");
    expect(capacity).toContain("limit_unavailable");
    expect(capacity).toContain("ONBOARDING_FIRST_RESTAURANT_PROPOSED_TOTAL");
    expect(capacity).not.toContain("?? 1");
    expect(capacity).not.toContain("createRestaurant");
    expect(capacity).not.toContain("insert(restaurants)");
    expect(occupancy).not.toContain("onboarding");
    expect(occupancy).not.toContain("registerOwner");
  });

  it("maps onboarding capacity failure distinctly from auth and 500 onboarding errors", () => {
    const http = read("server/auth-local.ts");
    expect(http).toContain("CommercialLimitExceededError");
    expect(http).toContain("CommercialOccupancyUnavailableError");
    expect(http).toContain('code: error.reasonCode');
    expect(http).toContain("commercial_capacity_unavailable");
    expect(http).not.toMatch(
      /CommercialLimitExceededError[\s\S]{0,200}status\(401\)/
    );
    expect(http).not.toMatch(
      /CommercialOccupancyUnavailableError[\s\S]{0,200}غير مصرح بالوصول/
    );
  });
});
