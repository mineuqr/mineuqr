/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 — runtime tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommercialSnapshotDefinition } from "@shared/commercial-catalog";
import {
  clearAllLifecycleSignals,
  enterGrace,
  markGrandfathered,
  markSuspended,
  clearSuspended,
  getLifecycleSignals,
  syncCommercialLifecycle,
  resolveEntitlementsFromSnapshot,
  checkEntitlement,
  checkLimit,
  hasFeature,
  CAPABILITY_ENTITLEMENT_MATRIX,
  resolveCapabilityEntitlement,
} from "../index";

const NOW = new Date("2026-07-30T12:00:00.000Z");

function proSnapshot(overrides?: Partial<CommercialSnapshotDefinition>): CommercialSnapshotDefinition {
  return {
    snapshotSchemaVersion: 1,
    planIdentityId: "plan-pro",
    planVersionId: "ver-pro",
    catalogPlanCode: "professional",
    commercialName: "Professional",
    versionName: "v1",
    currency: "USD",
    billingCycle: {
      id: "bc",
      code: "monthly",
      intervalCount: 1,
      intervalUnit: "month",
    },
    pricing: {
      amount: "26.40",
      currency: "USD",
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
    trialPolicy: null,
    promotionApplied: null,
    effectiveDate: NOW.toISOString(),
    region: null,
    ...overrides,
  };
}

describe("lifecycle sync", () => {
  it("maps trial / active / canceled / expired", () => {
    expect(
      syncCommercialLifecycle({
        dbStatus: "trial",
        trialEndsAt: "2026-08-01T00:00:00.000Z",
        currentPeriodEnd: null,
        now: NOW,
      }).state
    ).toBe("trial");

    expect(
      syncCommercialLifecycle({
        dbStatus: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        now: NOW,
      }).state
    ).toBe("active");

    expect(
      syncCommercialLifecycle({
        dbStatus: "canceled",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        now: NOW,
      }).state
    ).toBe("cancelled");

    expect(
      syncCommercialLifecycle({
        dbStatus: "expired",
        trialEndsAt: null,
        currentPeriodEnd: "2026-01-01T00:00:00.000Z",
        now: NOW,
      }).state
    ).toBe("expired");
  });

  it("projects grace and suspended from signals", () => {
    const grace = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-01-01T00:00:00.000Z",
      now: NOW,
      signals: { graceUntil: "2026-08-15T00:00:00.000Z" },
    });
    expect(grace.state).toBe("grace");
    expect(grace.entitlementsEnabled).toBe(true);

    const suspended = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      now: NOW,
      signals: { suspended: true },
    });
    expect(suspended.state).toBe("suspended");
    expect(suspended.entitlementsEnabled).toBe(false);
  });
});

describe("entitlement resolver from snapshot", () => {
  it("grants features for active", () => {
    const lifecycle = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      now: NOW,
    });
    const result = resolveEntitlementsFromSnapshot({
      ownerId: 1,
      role: "user",
      snapshot: proSnapshot(),
      snapshotId: "snap-1",
      legacyPlanId: 2,
      lifecycle,
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      now: NOW,
    });
    expect(result.entitlements.features.ordering).toBe(true);
    expect(result.entitlements.features.reports).toBe(true);
    expect(result.entitlements.plan).toBe("PROFESSIONAL");
    expect(result.meta.commercialLifecycleState).toBe("active");
  });

  it("grants for trial and grace; denies expired suspended cancelled", () => {
    const snap = proSnapshot();
    const base = {
      ownerId: 1,
      role: "user" as const,
      snapshot: snap,
      snapshotId: "snap-1",
      legacyPlanId: 2,
      trialEndsAt: "2026-08-01T00:00:00.000Z" as string | null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z" as string | null,
      now: NOW,
    };

    const trial = resolveEntitlementsFromSnapshot({
      ...base,
      lifecycle: syncCommercialLifecycle({
        dbStatus: "trial",
        trialEndsAt: base.trialEndsAt,
        currentPeriodEnd: null,
        now: NOW,
      }),
      dbStatus: "trial",
    });
    expect(trial.entitlements.plan).toBe("TRIAL");
    expect(trial.entitlements.features.ordering).toBe(true);

    const grace = resolveEntitlementsFromSnapshot({
      ...base,
      lifecycle: syncCommercialLifecycle({
        dbStatus: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-01-01T00:00:00.000Z",
        now: NOW,
        signals: { graceUntil: "2026-08-15T00:00:00.000Z" },
      }),
      dbStatus: "active",
    });
    expect(grace.meta.commercialLifecycleState).toBe("grace");
    expect(grace.entitlements.features.ordering).toBe(true);

    for (const dbStatus of ["expired", "canceled"] as const) {
      const denied = resolveEntitlementsFromSnapshot({
        ...base,
        lifecycle: syncCommercialLifecycle({
          dbStatus,
          trialEndsAt: null,
          currentPeriodEnd: "2026-01-01T00:00:00.000Z",
          now: NOW,
        }),
        dbStatus,
      });
      expect(denied.entitlements.plan).toBe("NONE");
      expect(denied.entitlements.features.ordering).toBe(false);
    }

    const suspended = resolveEntitlementsFromSnapshot({
      ...base,
      lifecycle: syncCommercialLifecycle({
        dbStatus: "active",
        trialEndsAt: null,
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
        now: NOW,
        signals: { suspended: true },
      }),
      dbStatus: "active",
    });
    expect(suspended.meta.commercialLifecycleState).toBe("suspended");
    expect(suspended.entitlements.plan).toBe("NONE");
  });

  it("marks grandfathered without changing Snapshot payload", () => {
    const lifecycle = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      now: NOW,
      signals: { grandfathered: true },
    });
    const result = resolveEntitlementsFromSnapshot({
      ownerId: 1,
      role: "user",
      snapshot: proSnapshot(),
      snapshotId: "snap-gf",
      legacyPlanId: 2,
      lifecycle,
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      now: NOW,
    });
    expect(result.meta.grandfathered).toBe(true);
    expect(result.entitlements.features.ordering).toBe(true);
  });
});

describe("capability matrix", () => {
  it("maps every feature capability to one entitlement key", () => {
    expect(CAPABILITY_ENTITLEMENT_MATRIX.length).toBeGreaterThan(10);
    const ordering = resolveCapabilityEntitlement("cap.ordering.core");
    expect(ordering?.entitlementKey).toBe("ordering");
  });
});

describe("enforcement with mocked runtime", () => {
  beforeEach(() => {
    clearAllLifecycleSignals();
    vi.resetModules();
  });

  it("overlay helpers set grace / suspend / grandfather", () => {
    enterGrace(99, "2026-08-15T00:00:00.000Z");
    markSuspended(99);
    markGrandfathered(99);
    const s = getLifecycleSignals(99);
    expect(s?.suspended).toBe(true);
    expect(s?.grandfathered).toBe(true);
    clearSuspended(99);
    expect(getLifecycleSignals(99)?.suspended).toBe(false);
  });
});

vi.mock("../../db", () => ({
  getUserById: vi.fn(async () => ({ id: 7, role: "user" })),
  getSubscriptionsByUser: vi.fn(),
}));

vi.mock("../../services/commercial-catalog", () => ({
  getSubscriptionCommercialBinding: vi.fn(),
  resolveCommercialFactsFromSnapshot: vi.fn(),
}));

vi.mock("../../commercial/buildCommercialContextFromDb", () => ({
  buildCommercialContextFromDb: vi.fn(),
}));

vi.mock("@commercial/getCommercialEntitlements", async () => {
  const actual = await vi.importActual<typeof import("@commercial/getCommercialEntitlements")>(
    "@commercial/getCommercialEntitlements"
  );
  return actual;
});

import { getSubscriptionsByUser } from "../../db";
import {
  getSubscriptionCommercialBinding,
  resolveCommercialFactsFromSnapshot,
} from "../../services/commercial-catalog";
import { resolveOwnerEntitlements } from "../subscriptionRuntimeService";
import { commercialTestSubRow } from "../../commercial/__tests__/commercialTestFixtures";

describe("subscription runtime service integration", () => {
  beforeEach(() => {
    clearAllLifecycleSignals();
    vi.mocked(getSubscriptionsByUser).mockReset();
    vi.mocked(getSubscriptionCommercialBinding).mockReset();
    vi.mocked(resolveCommercialFactsFromSnapshot).mockReset();
  });

  it("resolves exclusively from snapshot when bound", async () => {
    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 10,
        userId: 7,
        restaurantId: 0,
        status: "active",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      }),
    ] as never);
    vi.mocked(getSubscriptionCommercialBinding).mockResolvedValue({
      subscriptionId: 10,
      planVersionId: "ver-pro",
      snapshotId: "snap-1",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveCommercialFactsFromSnapshot).mockResolvedValue({
      source: "snapshot",
      snapshot: proSnapshot(),
      featureKeys: ["ordering", "reports"],
      limits: [],
    });

    const result = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(result.entitlements.features.ordering).toBe(true);
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("snapshot");

    expect(await hasFeature(7, "ordering", NOW)).toBe(true);
    expect(await hasFeature(7, "hotelMode", NOW)).toBe(false);

    const limit = await checkLimit({
      ownerId: 7,
      limitKey: "restaurants",
      proposedTotal: 3,
      now: NOW,
    });
    expect(limit.allowed).toBe(true);

    const over = await checkLimit({
      ownerId: 7,
      limitKey: "restaurants",
      proposedTotal: 9,
      now: NOW,
    });
    expect(over.allowed).toBe(false);

    const decision = await checkEntitlement({
      ownerId: 7,
      featureKey: "reports",
      now: NOW,
    });
    expect(decision.entitled).toBe(true);
    expect(decision.snapshotId).toBe("snap-1");
  });

  it("fail-closes when binding exists but snapshot unreadable", async () => {
    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 11,
        userId: 7,
        restaurantId: 0,
        status: "active",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      }),
    ] as never);
    vi.mocked(getSubscriptionCommercialBinding).mockResolvedValue({
      subscriptionId: 11,
      planVersionId: "ver-x",
      snapshotId: "snap-missing",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveCommercialFactsFromSnapshot).mockResolvedValue({
      source: "missing",
      snapshot: null,
      featureKeys: [],
      limits: [],
    });

    const result = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(result.entitlements.plan).toBe("NONE");
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("snapshot_fail_closed");
  });

  it("applies suspend / grace overlays on bound snapshot path", async () => {
    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 12,
        userId: 7,
        restaurantId: 0,
        status: "active",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      }),
    ] as never);
    vi.mocked(getSubscriptionCommercialBinding).mockResolvedValue({
      subscriptionId: 12,
      planVersionId: "ver-pro",
      snapshotId: "snap-1",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveCommercialFactsFromSnapshot).mockResolvedValue({
      source: "snapshot",
      snapshot: proSnapshot(),
      featureKeys: ["ordering"],
      limits: [],
    });

    markSuspended(12);
    const suspended = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(suspended.entitlements.features.ordering).toBe(false);
    expect(
      (suspended as { meta?: { commercialLifecycleState?: string } }).meta
        ?.commercialLifecycleState
    ).toBe("suspended");

    clearSuspended(12);
    enterGrace(12, "2026-09-01T00:00:00.000Z");
    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 12,
        userId: 7,
        restaurantId: 0,
        status: "active",
        currentPeriodEnd: "2026-01-01T00:00:00.000Z",
      }),
    ] as never);

    const grace = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(
      (grace as { meta?: { commercialLifecycleState?: string } }).meta
        ?.commercialLifecycleState
    ).toBe("grace");
    expect(grace.entitlements.features.ordering).toBe(true);
  });
});
