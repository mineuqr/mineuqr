/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — persistence + interpretation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPlatformOwnerAccessStoreForTests,
  setPlatformOwnerAccessMemoryOnlyForTests,
} from "../store";
import { interpretOwnerAccessRecord, loadOwnerAccessMode, persistOwnerAccessMode } from "../service";

vi.mock("../livePlanComposition", () => ({
  getCurrentLivePlanCompositionByCode: vi.fn(async (code: string) => {
    const plans: Record<string, { catalogPlanCode: string; commercialName: string }> = {
      basic: { catalogPlanCode: "basic", commercialName: "Basic" },
      professional: { catalogPlanCode: "professional", commercialName: "Professional" },
      enterprise: { catalogPlanCode: "enterprise", commercialName: "Enterprise" },
    };
    const hit = plans[code];
    if (!hit) return null;
    return {
      planId: `plan-${code}`,
      catalogPlanCode: hit.catalogPlanCode,
      commercialName: hit.commercialName,
      featureKeys: ["qrMenu"],
      limits: [],
    };
  }),
}));

vi.mock("../../subscription-runtime/cache", () => ({
  invalidateEntitlementCache: vi.fn(),
}));

vi.mock("../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

const OWNER = "owner-openid-persist";

describe("owner access persistence", () => {
  beforeEach(() => {
    setPlatformOwnerAccessMemoryOnlyForTests(true);
  });

  afterEach(() => {
    clearPlatformOwnerAccessStoreForTests();
    setPlatformOwnerAccessMemoryOnlyForTests(false);
  });

  it("defaults to FULL_PLATFORM when no row exists", async () => {
    const state = await loadOwnerAccessMode(OWNER);
    expect(state).toEqual({
      ok: true,
      persisted: false,
      mode: "FULL_PLATFORM",
      simulatedPlanCode: null,
    });
  });

  it("persists SIMULATED_PLAN then returns to FULL_PLATFORM", async () => {
    const previous = await loadOwnerAccessMode(OWNER);
    const simulated = await persistOwnerAccessMode({
      ownerOpenId: OWNER,
      ownerUserId: 1,
      mode: "SIMULATED_PLAN",
      simulatedPlanCode: "professional",
      previous,
    });
    expect(simulated).toMatchObject({
      ok: true,
      persisted: true,
      mode: "SIMULATED_PLAN",
      simulatedPlanCode: "professional",
    });

    const restored = await persistOwnerAccessMode({
      ownerOpenId: OWNER,
      ownerUserId: 1,
      mode: "FULL_PLATFORM",
      simulatedPlanCode: null,
      previous: simulated,
    });
    expect(restored).toMatchObject({
      ok: true,
      mode: "FULL_PLATFORM",
      simulatedPlanCode: null,
    });
  });

  it("rejects invalid simulation targets without writing", async () => {
    const previous = await loadOwnerAccessMode(OWNER);
    await expect(
      persistOwnerAccessMode({
        ownerOpenId: OWNER,
        ownerUserId: 1,
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: "does-not-exist",
        previous,
      })
    ).rejects.toThrow(/SIMULATION_UNAVAILABLE/);
    expect(await loadOwnerAccessMode(OWNER)).toMatchObject({
      mode: "FULL_PLATFORM",
      persisted: false,
    });
  });

  it("fails closed on invalid persisted combinations", () => {
    expect(
      interpretOwnerAccessRecord({
        mode: "FULL_PLATFORM",
        simulatedPlanCode: "professional",
      })
    ).toMatchObject({ ok: false, reason: "invalid_persisted_state" });
    expect(
      interpretOwnerAccessRecord({
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: null,
      })
    ).toMatchObject({ ok: false, reason: "invalid_persisted_state" });
  });
});
