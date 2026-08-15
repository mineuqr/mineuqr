/**
 * COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1
 * Owner / customer / fail-closed matrix via the canonical hub.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { FeatureKey } from "@commercial/featureKeys";
import { FEATURE_KEYS } from "@commercial/featureKeys";

vi.mock("../../subscription-runtime/subscriptionRuntimeService", () => ({
  resolveOwnerEntitlements: vi.fn(),
}));

import { resolveOwnerEntitlements } from "../../subscription-runtime/subscriptionRuntimeService";
import { checkEntitlement, hasFeature, requireFeature } from "../../subscription-runtime/enforcement";
import { requireDevicesFeature } from "../authorization/requireDevicesFeature";

const NOW = new Date("2026-08-15T00:00:00.000Z");

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
  lifecycleState?: string;
}) {
  return {
    context: { ownerId: 1, role: "user", subscription: null, now: NOW },
    entitlements: {
      accountType: input.plan === "NONE" ? "NONE" : "PAYING",
      plan: input.plan,
      status: input.plan === "NONE" ? "expired" : "active",
      limits: { restaurants: 1, categories: 10, items: 100 },
      features: featuresFrom(input.enabled),
      commercial: {
        isTrial: false,
        isPaid: input.plan !== "NONE" && input.plan !== "ADMIN",
        isEnterprise: input.plan === "ENTERPRISE",
        isAdmin: input.plan === "ADMIN",
        countsInMrr: false,
        countsInRevenue: false,
        invoiceEligible: false,
      },
    },
    meta: {
      commercialResolutionSource: input.source,
      commercialLifecycleState: input.lifecycleState ?? "active",
    },
  };
}

describe("devices entitlement matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Owner + FULL_PLATFORM → devices allowed", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "ADMIN",
        enabled: [...FEATURE_KEYS],
        source: "platform_owner_full_platform",
      }) as never
    );
    expect(await hasFeature(1, "devices", NOW)).toBe(true);
    await expect(requireFeature(1, "devices", NOW)).resolves.toBeUndefined();
    await expect(requireDevicesFeature(1, NOW)).resolves.toBeUndefined();
  });

  it("Owner + SIMULATED_BASIC → devices denied", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "BASIC",
        enabled: [
          "checkManagement",
          "multiCheckAllocation",
          "printing",
          "realtime",
          "refund",
          "splitPayment",
        ],
        source: "platform_owner_simulated_plan",
      }) as never
    );
    expect(await hasFeature(1, "devices", NOW)).toBe(false);
    await expect(requireDevicesFeature(1, NOW)).rejects.toBeInstanceOf(TRPCError);
  });

  it("Owner + SIMULATED_PROFESSIONAL → devices allowed", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "PROFESSIONAL",
        enabled: ["devices", "kitchen", "ordering"],
        source: "platform_owner_simulated_plan",
      }) as never
    );
    expect(await hasFeature(1, "devices", NOW)).toBe(true);
    await expect(requireDevicesFeature(1, NOW)).resolves.toBeUndefined();
  });

  it("Owner + SIMULATED_ENTERPRISE → devices allowed", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "ENTERPRISE",
        enabled: ["devices", "kitchen", "ordering"],
        source: "platform_owner_simulated_plan",
      }) as never
    );
    expect(await hasFeature(1, "devices", NOW)).toBe(true);
  });

  it("mode switch FULL → BASIC denies immediately (no Full Platform leak)", async () => {
    vi.mocked(resolveOwnerEntitlements)
      .mockResolvedValueOnce(
        entitlementsResult({
          plan: "ADMIN",
          enabled: [...FEATURE_KEYS],
          source: "platform_owner_full_platform",
        }) as never
      )
      .mockResolvedValueOnce(
        entitlementsResult({
          plan: "BASIC",
          enabled: ["printing"],
          source: "platform_owner_simulated_plan",
        }) as never
      );
    expect(await hasFeature(1, "devices", NOW)).toBe(true);
    expect(await hasFeature(1, "devices", NOW)).toBe(false);
  });

  it("mode switch BASIC → PROFESSIONAL allows immediately", async () => {
    vi.mocked(resolveOwnerEntitlements)
      .mockResolvedValueOnce(
        entitlementsResult({
          plan: "BASIC",
          enabled: ["printing"],
          source: "platform_owner_simulated_plan",
        }) as never
      )
      .mockResolvedValueOnce(
        entitlementsResult({
          plan: "PROFESSIONAL",
          enabled: ["devices"],
          source: "platform_owner_simulated_plan",
        }) as never
      );
    expect(await hasFeature(1, "devices", NOW)).toBe(false);
    expect(await hasFeature(1, "devices", NOW)).toBe(true);
  });

  it("Customer Basic → devices denied", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "BASIC",
        enabled: ["printing", "refund"],
        source: "live_plan",
      }) as never
    );
    expect(await hasFeature(8, "devices", NOW)).toBe(false);
    await expect(requireDevicesFeature(8, NOW)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("Customer Professional → devices allowed", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "PROFESSIONAL",
        enabled: ["devices", "kitchen"],
        source: "live_plan",
      }) as never
    );
    expect(await hasFeature(8, "devices", NOW)).toBe(true);
  });

  it("Customer Enterprise → devices allowed", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "ENTERPRISE",
        enabled: ["devices"],
        source: "live_plan",
      }) as never
    );
    expect(await hasFeature(8, "devices", NOW)).toBe(true);
  });

  it("expired / NONE → devices denied", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "NONE",
        enabled: [],
        source: "live_plan",
        lifecycleState: "expired",
      }) as never
    );
    const decision = await checkEntitlement({
      ownerId: 22,
      featureKey: "devices",
      now: NOW,
    });
    expect(decision.entitled).toBe(false);
    await expect(requireDevicesFeature(22, NOW)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("invalid entitlement / missing capability data → denied", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue(
      entitlementsResult({
        plan: "BASIC",
        enabled: [],
        source: "platform_owner_invalid_mode",
      }) as never
    );
    expect(await hasFeature(1, "devices", NOW)).toBe(false);
  });

  it("resolver failure → requireDevicesFeature denies", async () => {
    vi.mocked(resolveOwnerEntitlements).mockRejectedValue(new Error("db down"));
    await expect(requireDevicesFeature(1, NOW)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
