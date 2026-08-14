/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — entitlement authority.
 */
import { describe, expect, it, vi } from "vitest";
import { FEATURE_KEYS } from "@commercial/featureKeys";
import {
  resolveFullPlatformEntitlements,
  resolvePlatformOwnerEntitlements,
} from "../entitlements";

vi.mock("../livePlanComposition", () => ({
  getCurrentLivePlanCompositionByCode: vi.fn(async (code: string) => {
    const catalog: Record<
      string,
      { featureKeys: string[]; limits: { limitKey: string; value: number | null }[] }
    > = {
      basic: {
        featureKeys: ["qrMenu", "search"],
        limits: [
          { limitKey: "restaurants", value: 1 },
          { limitKey: "categories", value: 10 },
          { limitKey: "items", value: 100 },
        ],
      },
      professional: {
        featureKeys: ["qrMenu", "search", "ordering", "reports"],
        limits: [
          { limitKey: "restaurants", value: 5 },
          { limitKey: "categories", value: 50 },
          { limitKey: "items", value: 500 },
        ],
      },
      enterprise: {
        featureKeys: ["qrMenu", "search", "ordering", "reports", "kitchen"],
        limits: [
          { limitKey: "restaurants", value: null },
          { limitKey: "categories", value: null },
          { limitKey: "items", value: null },
        ],
      },
    };
    const hit = catalog[code];
    if (!hit) return null;
    return {
      planId: `plan-${code}`,
      catalogPlanCode: code,
      commercialName: code,
      featureKeys: hit.featureKeys,
      limits: hit.limits,
    };
  }),
}));

const NOW = new Date("2026-08-15T00:00:00.000Z");

describe("platform owner entitlements", () => {
  it("FULL_PLATFORM enables all current commercial capabilities", () => {
    const result = resolveFullPlatformEntitlements({
      ownerId: 1,
      role: "admin",
      now: NOW,
    });
    expect(result.meta?.commercialResolutionSource).toBe(
      "platform_owner_full_platform"
    );
    expect(result.entitlements.plan).toBe("ADMIN");
    expect(result.entitlements.limits).toEqual({
      restaurants: null,
      categories: null,
      items: null,
    });
    for (const key of FEATURE_KEYS) {
      expect(result.entitlements.features[key]).toBe(true);
    }
  });

  it("SIMULATED_PLAN uses current Live Plan capabilities only", async () => {
    const basic = await resolvePlatformOwnerEntitlements({
      ownerId: 1,
      role: "admin",
      now: NOW,
      state: {
        ok: true,
        persisted: true,
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: "basic",
      },
    });
    expect(basic.meta?.commercialResolutionSource).toBe(
      "platform_owner_simulated_plan"
    );
    expect(basic.entitlements.plan).toBe("BASIC");
    expect(basic.entitlements.features.ordering).toBe(false);
    expect(basic.entitlements.limits.restaurants).toBe(1);

    const pro = await resolvePlatformOwnerEntitlements({
      ownerId: 1,
      role: "admin",
      now: NOW,
      state: {
        ok: true,
        persisted: true,
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: "professional",
      },
    });
    expect(pro.entitlements.plan).toBe("PROFESSIONAL");
    expect(pro.entitlements.features.ordering).toBe(true);
    expect(pro.entitlements.limits.restaurants).toBe(5);

    const enterprise = await resolvePlatformOwnerEntitlements({
      ownerId: 1,
      role: "admin",
      now: NOW,
      state: {
        ok: true,
        persisted: true,
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: "enterprise",
      },
    });
    expect(enterprise.entitlements.plan).toBe("ENTERPRISE");
    expect(enterprise.entitlements.features.kitchen).toBe(true);
  });

  it("invalid or missing simulated plan fails closed", async () => {
    const missing = await resolvePlatformOwnerEntitlements({
      ownerId: 1,
      role: "admin",
      now: NOW,
      state: {
        ok: true,
        persisted: true,
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: "ghost",
      },
    });
    expect(missing.meta?.commercialResolutionSource).toBe(
      "platform_owner_simulation_unavailable"
    );
    expect(missing.entitlements.plan).toBe("NONE");

    const invalid = await resolvePlatformOwnerEntitlements({
      ownerId: 1,
      role: "admin",
      now: NOW,
      state: {
        ok: false,
        reason: "invalid_persisted_state",
        mode: "FULL_PLATFORM",
        simulatedPlanCode: "professional",
      },
    });
    expect(invalid.meta?.commercialResolutionSource).toBe(
      "platform_owner_invalid_mode"
    );
    expect(invalid.entitlements.plan).toBe("NONE");
  });
});
