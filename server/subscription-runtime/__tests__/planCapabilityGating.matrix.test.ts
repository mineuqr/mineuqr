/**
 * COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1
 * ON / OFF / FULL_PLATFORM / fail-closed matrix for the four catalog-promoted keys.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeatureKey } from "@commercial/featureKeys";
import { FEATURE_KEYS } from "@commercial/featureKeys";
import { CATALOG_PROMOTED_PROJECTION_IDS } from "@shared/commercial-projection";

vi.mock("../subscriptionRuntimeService", () => ({
  resolveOwnerEntitlements: vi.fn(),
}));

import { resolveOwnerEntitlements } from "../subscriptionRuntimeService";
import { hasFeature, requireFeature } from "../enforcement";

const NOW = new Date("2026-08-16T00:00:00.000Z");
const KEYS = CATALOG_PROMOTED_PROJECTION_IDS;

function featuresFrom(enabled: readonly string[]) {
  const features = {} as Record<FeatureKey, boolean>;
  for (const key of FEATURE_KEYS) {
    features[key] = enabled.includes(key);
  }
  return features;
}

function entitlementsResult(input: {
  plan: string;
  enabled: readonly string[];
  source: string;
}) {
  return {
    context: { ownerId: 1, role: "user", subscription: null, now: NOW },
    entitlements: {
      accountType: input.plan === "ADMIN" ? "ADMIN" : "PAYING",
      plan: input.plan,
      status: "active",
      limits: { restaurants: 1, categories: 10, items: 100 },
      features: featuresFrom(input.enabled),
      commercial: {
        isTrial: false,
        isPaid: input.plan !== "ADMIN",
        isEnterprise: false,
        isAdmin: input.plan === "ADMIN",
        countsInMrr: false,
        countsInRevenue: false,
        invoiceEligible: false,
      },
    },
    meta: { commercialResolutionSource: input.source },
  };
}

describe("catalog-promoted plan capability matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ON → requireFeature allows each canonical key", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "PROFESSIONAL",
        enabled: [...KEYS],
        source: "live_plan",
      }) as never
    );
    for (const key of KEYS) {
      expect(await hasFeature(1, key, NOW)).toBe(true);
      await expect(requireFeature(1, key, NOW)).resolves.toBeUndefined();
    }
  });

  it("OFF → requireFeature denies each canonical key", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "PROFESSIONAL",
        enabled: ["ordering"],
        source: "live_plan",
      }) as never
    );
    for (const key of KEYS) {
      expect(await hasFeature(1, key, NOW)).toBe(false);
      await expect(requireFeature(1, key, NOW)).rejects.toMatchObject({
        code: "COMMERCIAL_ENTITLEMENT_DENIED",
      });
    }
  });

  it("missing key is fail-closed (disabled)", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "BASIC",
        enabled: ["ordering", "printing"],
        source: "live_plan",
      }) as never
    );
    expect(await hasFeature(1, "menuDesign", NOW)).toBe(false);
    await expect(requireFeature(1, "menuDesign", NOW)).rejects.toMatchObject({
      code: "COMMERCIAL_ENTITLEMENT_DENIED",
    });
  });

  it("FULL_PLATFORM grants all four keys", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "ADMIN",
        enabled: [...FEATURE_KEYS],
        source: "platform_owner_full_platform",
      }) as never
    );
    for (const key of KEYS) {
      expect(await hasFeature(1, key, NOW)).toBe(true);
      await expect(requireFeature(1, key, NOW)).resolves.toBeUndefined();
    }
  });

  it("plan change ON → OFF then OFF → ON follows current entitlements", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValueOnce(
      entitlementsResult({
        plan: "PROFESSIONAL",
        enabled: ["menuDesign"],
        source: "live_plan",
      }) as never
    );
    expect(await hasFeature(1, "menuDesign", NOW)).toBe(true);

    vi.mocked(resolveOwnerEntitlements).mockResolvedValueOnce(
      entitlementsResult({
        plan: "BASIC",
        enabled: ["ordering"],
        source: "live_plan",
      }) as never
    );
    expect(await hasFeature(1, "menuDesign", NOW)).toBe(false);

    vi.mocked(resolveOwnerEntitlements).mockResolvedValueOnce(
      entitlementsResult({
        plan: "PROFESSIONAL",
        enabled: ["menuDesign"],
        source: "live_plan",
      }) as never
    );
    expect(await hasFeature(1, "menuDesign", NOW)).toBe(true);
  });

  it("FEATURE_KEYS includes the four catalog-promoted identities", () => {
    for (const key of KEYS) {
      expect(FEATURE_KEYS).toContain(key);
    }
  });
});
