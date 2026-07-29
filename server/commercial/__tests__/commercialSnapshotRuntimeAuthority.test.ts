/**
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1 — branch resolution + architecture guards.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEntitlementsFromCommercialSnapshot } from "../snapshotRuntimeAuthority";
import {
  commercialRuntimeAuthorityObservability,
} from "../../services/commercial-catalog/runtimeAuthorityObservability";
import type { CommercialSnapshotDefinition } from "@shared/commercial-catalog";
import {
  COMMERCIAL_TEST_NOW,
  commercialTestSubRow,
  installCommercialTestClock,
  isoPlusDaysFromCommercialTestNow,
} from "./commercialTestFixtures";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

vi.mock("../../db", () => ({
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
}));

vi.mock("../../services/commercial-catalog", () => ({
  getSubscriptionCommercialBinding: vi.fn(),
  resolveCommercialFactsFromSnapshot: vi.fn(),
}));

import { getUserById, getSubscriptionsByUser } from "../../db";
import {
  getSubscriptionCommercialBinding,
  resolveCommercialFactsFromSnapshot,
} from "../../services/commercial-catalog";
import { getCommercialEntitlements } from "../getCommercialEntitlements";

const FIXED_NOW = COMMERCIAL_TEST_NOW;

function proSnapshot(): CommercialSnapshotDefinition {
  return {
    snapshotSchemaVersion: 1,
    planIdentityId: "plan-pro",
    planVersionId: "ver-pro",
    catalogPlanCode: "professional",
    commercialName: "Professional",
    versionName: "v1",
    currency: "SAR",
    billingCycle: {
      id: "bc",
      code: "monthly",
      intervalCount: 1,
      intervalUnit: "month",
    },
    pricing: {
      amount: "99.00",
      currency: "SAR",
      billingCycleId: "bc",
      billingCycleCode: "monthly",
    },
    includedFeatures: [
      { featureKey: "ordering", included: true },
      { featureKey: "reports", included: true },
      { featureKey: "qrMenu", included: true },
      { featureKey: "search", included: true },
    ],
    usageLimits: [
      { limitKey: "restaurants", value: 5 },
      { limitKey: "items", value: 500 },
      { limitKey: "categories", value: 50 },
    ],
    trialPolicy: {
      trialPolicyId: "t",
      durationDays: 14,
      name: "Trial",
    },
    promotionApplied: null,
    effectiveDate: FIXED_NOW.toISOString(),
    region: null,
  };
}

describe("COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1 architecture guards", () => {
  it("removes overlay / prefer-snapshot patterns from entitlement hub", () => {
    const src = read("server/commercial/getCommercialEntitlements.ts");
    expect(src).not.toMatch(/\.\.\.base/);
    expect(src).not.toMatch(/prefer snapshot/i);
    expect(src).not.toMatch(/overlay onto/i);
    expect(src).toContain("Legacy Bridge ONLY");
    expect(src).toContain("Snapshot ONLY");
  });

  it("wires Snapshot bind on payment + admin activation paths", () => {
    expect(read("server/paypal-webhook.ts")).toContain(
      "ensureCommercialSnapshotBoundForSubscription"
    );
    expect(read("server/tap-webhook.ts")).toContain(
      "ensureCommercialSnapshotBoundForSubscription"
    );
    expect(read("server/subscriptionAudit.ts")).toContain(
      "ensureCommercialSnapshotBoundForSubscription"
    );
    expect(read("server/subscriptionPlanLimits.ts")).toContain(
      "snapshotQuotaLimits"
    );
  });

  it("keeps mixedResolutionCount at 0", () => {
    expect(
      commercialRuntimeAuthorityObservability.snapshot().mixedResolutionCount
    ).toBe(0);
  });
});

describe("buildEntitlementsFromCommercialSnapshot", () => {
  it("resolves features and limits only from snapshot", () => {
    const result = buildEntitlementsFromCommercialSnapshot(proSnapshot(), {
      ownerId: 10,
      role: "user",
      status: "active",
      trialEndsAt: null,
      currentPeriodEnd: isoPlusDaysFromCommercialTestNow(30),
      legacyPlanId: 30002,
      now: FIXED_NOW,
    });
    expect(result.entitlements.plan).toBe("PROFESSIONAL");
    expect(result.entitlements.features.ordering).toBe(true);
    expect(result.entitlements.features.excelExport).toBe(false);
    expect(result.entitlements.limits.restaurants).toBe(5);
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("snapshot");
  });
});

describe("getCommercialEntitlements branch resolution", () => {
  installCommercialTestClock();

  beforeEach(() => {
    vi.clearAllMocks();
    commercialRuntimeAuthorityObservability.resetForTests();
  });

  it("bound subscription resolves Snapshot only (no Legacy matrix plan)", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      commercialTestSubRow({
        id: 99,
        userId: 42,
        restaurantId: 0,
        planId: 30001,
        status: "active",
      }),
    ]);
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionId: 99,
      planVersionId: "ver-pro",
      snapshotId: "snap-1",
      legacyPlanId: 30002,
      createdAt: FIXED_NOW.toISOString(),
    });
    (resolveCommercialFactsFromSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      source: "snapshot",
      snapshot: proSnapshot(),
      featureKeys: ["ordering", "reports", "qrMenu", "search"],
      limits: proSnapshot().usageLimits,
    });

    const result = await getCommercialEntitlements(42, FIXED_NOW);

    expect(result.entitlements.plan).toBe("PROFESSIONAL");
    expect(result.entitlements.limits.restaurants).toBe(5);
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("snapshot");
    expect(
      commercialRuntimeAuthorityObservability.snapshot().mixedResolutionCount
    ).toBe(0);
    expect(
      commercialRuntimeAuthorityObservability.snapshot().snapshotResolutionCount
    ).toBe(1);
  });

  it("bound + missing snapshot fails closed (no Legacy)", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 43,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      commercialTestSubRow({
        id: 100,
        userId: 43,
        restaurantId: 0,
        planId: 30002,
        status: "active",
      }),
    ]);
    (getSubscriptionCommercialBinding as ReturnType<typeof vi.fn>).mockResolvedValue({
      subscriptionId: 100,
      planVersionId: "ver-pro",
      snapshotId: "snap-missing",
      legacyPlanId: 30002,
      createdAt: FIXED_NOW.toISOString(),
    });
    (resolveCommercialFactsFromSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      source: "missing",
      snapshot: null,
      featureKeys: [],
      limits: [],
    });

    const result = await getCommercialEntitlements(43, FIXED_NOW);

    expect(result.entitlements.plan).toBe("NONE");
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("snapshot_fail_closed");
  });
});
