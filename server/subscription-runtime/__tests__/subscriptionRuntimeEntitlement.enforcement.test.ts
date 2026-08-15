/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 — runtime tests.
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — live plan capabilities (no snapshot freeze).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolveFromLivePlanInput } from "../entitlementResolver";
import {
  clearAllLifecycleSignals,
  enterGrace,
  markGrandfathered,
  markSuspended,
  clearSuspended,
  getLifecycleSignals,
  syncCommercialLifecycle,
  resolveEntitlementsFromLivePlan,
  checkEntitlement,
  checkLimit,
  hasFeature,
  CAPABILITY_ENTITLEMENT_MATRIX,
  resolveCapabilityEntitlement,
} from "../index";

const NOW = new Date("2026-07-30T12:00:00.000Z");

const PRO_LIVE = {
  planId: "plan-pro",
  catalogPlanCode: "professional",
  featureKeys: ["ordering", "reports", "qrMenu", "search"],
  limits: [
    { limitKey: "restaurants", value: 5, unit: "count" },
    { limitKey: "items", value: 500, unit: "count" },
    { limitKey: "categories", value: 50, unit: "count" },
  ],
  chargedTerms: {
    planId: "plan-pro",
    catalogPlanCode: "professional",
    commercialName: "Professional",
    chargedAmount: "26.40",
    chargedCurrency: "USD",
    billingCycleId: "bc",
    billingCycleCode: "monthly",
    intervalCount: 1,
    intervalUnit: "month" as const,
    periodStart: null,
    periodEnd: null,
  },
};

function liveInput(
  overrides: Partial<ResolveFromLivePlanInput> &
    Pick<ResolveFromLivePlanInput, "lifecycle" | "dbStatus">
): ResolveFromLivePlanInput {
  return {
    ownerId: 1,
    role: "user",
    ...PRO_LIVE,
    legacyPlanId: 2,
    trialEndsAt: null,
    currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    now: NOW,
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

describe("entitlement resolver from live plan", () => {
  it("grants features for active", () => {
    const lifecycle = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      now: NOW,
    });
    const result = resolveEntitlementsFromLivePlan(
      liveInput({ lifecycle, dbStatus: "active" })
    );
    expect(result.entitlements.features.ordering).toBe(true);
    expect(result.entitlements.features.reports).toBe(true);
    expect(result.entitlements.plan).toBe("PROFESSIONAL");
    expect(result.meta.commercialLifecycleState).toBe("active");
  });

  it("grants for trial and grace; denies expired suspended cancelled", () => {
    const trial = resolveEntitlementsFromLivePlan(
      liveInput({
        lifecycle: syncCommercialLifecycle({
          dbStatus: "trial",
          trialEndsAt: "2026-08-01T00:00:00.000Z",
          currentPeriodEnd: null,
          now: NOW,
        }),
        dbStatus: "trial",
        trialEndsAt: "2026-08-01T00:00:00.000Z",
      })
    );
    expect(trial.entitlements.plan).toBe("TRIAL");
    expect(trial.entitlements.features.ordering).toBe(true);

    const grace = resolveEntitlementsFromLivePlan(
      liveInput({
        lifecycle: syncCommercialLifecycle({
          dbStatus: "active",
          trialEndsAt: null,
          currentPeriodEnd: "2026-01-01T00:00:00.000Z",
          now: NOW,
          signals: { graceUntil: "2026-08-15T00:00:00.000Z" },
        }),
        dbStatus: "active",
      })
    );
    expect(grace.meta.commercialLifecycleState).toBe("grace");
    expect(grace.entitlements.features.ordering).toBe(true);

    for (const dbStatus of ["expired", "canceled"] as const) {
      const denied = resolveEntitlementsFromLivePlan(
        liveInput({
          lifecycle: syncCommercialLifecycle({
            dbStatus,
            trialEndsAt: null,
            currentPeriodEnd: "2026-01-01T00:00:00.000Z",
            now: NOW,
          }),
          dbStatus,
        })
      );
      expect(denied.entitlements.plan).toBe("NONE");
      expect(denied.entitlements.features.ordering).toBe(false);
    }

    const suspended = resolveEntitlementsFromLivePlan(
      liveInput({
        lifecycle: syncCommercialLifecycle({
          dbStatus: "active",
          trialEndsAt: null,
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
          now: NOW,
          signals: { suspended: true },
        }),
        dbStatus: "active",
      })
    );
    expect(suspended.meta.commercialLifecycleState).toBe("suspended");
    expect(suspended.entitlements.plan).toBe("NONE");
  });

  it("marks grandfathered without freezing live capabilities", () => {
    const lifecycle = syncCommercialLifecycle({
      dbStatus: "active",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      now: NOW,
      signals: { grandfathered: true },
    });
    const result = resolveEntitlementsFromLivePlan(
      liveInput({ lifecycle, dbStatus: "active" })
    );
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
  resolveLivePlanCapabilities: vi.fn(),
}));

vi.mock("../../commercial/buildCommercialContextFromDb", () => ({
  buildCommercialContextFromDb: vi.fn(),
}));

vi.mock("@commercial/getCommercialEntitlements", async () => {
  const actual = await vi.importActual<
    typeof import("@commercial/getCommercialEntitlements")
  >("@commercial/getCommercialEntitlements");
  return actual;
});

import { getSubscriptionsByUser } from "../../db";
import {
  getSubscriptionCommercialBinding,
  resolveLivePlanCapabilities,
} from "../../services/commercial-catalog";
import { resolveOwnerEntitlements } from "../subscriptionRuntimeService";
import { commercialTestSubRow } from "../../commercial/__tests__/commercialTestFixtures";

function livePlanFacts(featureKeys = ["ordering", "reports"]) {
  return {
    source: "live_plan" as const,
    planId: "plan-pro",
    catalogPlanCode: "professional",
    featureKeys,
    limits: PRO_LIVE.limits,
    chargedTerms: PRO_LIVE.chargedTerms,
  };
}

describe("subscription runtime service integration", () => {
  beforeEach(() => {
    clearAllLifecycleSignals();
    vi.mocked(getSubscriptionsByUser).mockReset();
    vi.mocked(getSubscriptionCommercialBinding).mockReset();
    vi.mocked(resolveLivePlanCapabilities).mockReset();
  });

  it("resolves exclusively from the current live plan when bound", async () => {
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
      planId: "plan-pro",
      chargedAmount: "26.40",
      chargedCurrency: "USD",
      billingCycleId: "bc",
      billingCycleCode: "monthly",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveLivePlanCapabilities).mockResolvedValue(livePlanFacts());

    const result = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(result.entitlements.features.ordering).toBe(true);
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("live_plan");

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
    expect(decision.planId).toBe("plan-pro");
  });

  it("fail-closes when binding exists but live plan is unreadable", async () => {
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
      planId: "missing-plan",
      chargedAmount: null,
      chargedCurrency: null,
      billingCycleId: null,
      billingCycleCode: null,
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveLivePlanCapabilities).mockResolvedValue({
      source: "missing",
      planId: "missing-plan",
      catalogPlanCode: null,
      featureKeys: [],
      limits: [],
      chargedTerms: null,
    });

    const result = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(result.entitlements.plan).toBe("NONE");
    expect(
      (result as { meta?: { commercialResolutionSource?: string } }).meta
        ?.commercialResolutionSource
    ).toBe("live_plan_fail_closed");
  });

  it("applies suspend / grace overlays on bound live plan path", async () => {
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
      planId: "plan-pro",
      chargedAmount: "26.40",
      chargedCurrency: "USD",
      billingCycleId: "bc",
      billingCycleCode: "monthly",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveLivePlanCapabilities).mockResolvedValue(
      livePlanFacts(["ordering"])
    );

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
    expect(grace.meta?.commercialAccountState).toBe("ACTIVE");
  });

  it("stamps ACTIVE for a current paid subscription", async () => {
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
      planId: "plan-pro",
      chargedAmount: "26.40",
      chargedCurrency: "USD",
      billingCycleId: "bc",
      billingCycleCode: "monthly",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveLivePlanCapabilities).mockResolvedValue(livePlanFacts());

    const result = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(result.meta?.commercialAccountState).toBe("ACTIVE");
    expect(result.entitlements.features.ordering).toBe(true);
  });

  it("stamps FROZEN when the paid period has ended", async () => {
    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 13,
        userId: 7,
        restaurantId: 0,
        status: "active",
        currentPeriodEnd: "2026-07-01T00:00:00.000Z",
      }),
    ] as never);
    vi.mocked(getSubscriptionCommercialBinding).mockResolvedValue({
      subscriptionId: 13,
      planId: "plan-pro",
      chargedAmount: "26.40",
      chargedCurrency: "USD",
      billingCycleId: "bc",
      billingCycleCode: "monthly",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveLivePlanCapabilities).mockResolvedValue(livePlanFacts());

    const result = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(result.meta?.commercialAccountState).toBe("FROZEN");
    expect(result.meta?.commercialAccountStateReason).toBe("commercial_access_expired");
    expect(result.entitlements.features.ordering).toBe(false);
  });

  it("stamps ACTIVE for a current trial and FROZEN after trial end", async () => {
    vi.mocked(getSubscriptionCommercialBinding).mockResolvedValue({
      subscriptionId: 14,
      planId: "plan-pro",
      chargedAmount: null,
      chargedCurrency: null,
      billingCycleId: "bc",
      billingCycleCode: "monthly",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveLivePlanCapabilities).mockResolvedValue(livePlanFacts());

    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 14,
        userId: 7,
        restaurantId: 0,
        status: "trial",
        trialEndsAt: "2026-08-01T00:00:00.000Z",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      }),
    ] as never);
    const activeTrial = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(activeTrial.meta?.commercialAccountState).toBe("ACTIVE");

    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 14,
        userId: 7,
        restaurantId: 0,
        status: "trial",
        trialEndsAt: "2026-07-01T00:00:00.000Z",
        currentPeriodEnd: "2026-07-01T00:00:00.000Z",
      }),
    ] as never);
    const expiredTrial = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(expiredTrial.meta?.commercialAccountState).toBe("FROZEN");
  });

  it("restores ACTIVE when a later valid paid period replaces expiry", async () => {
    vi.mocked(getSubscriptionCommercialBinding).mockResolvedValue({
      subscriptionId: 15,
      planId: "plan-pro",
      chargedAmount: "26.40",
      chargedCurrency: "USD",
      billingCycleId: "bc",
      billingCycleCode: "monthly",
      legacyPlanId: 2,
      createdAt: NOW.toISOString(),
    });
    vi.mocked(resolveLivePlanCapabilities).mockResolvedValue(livePlanFacts());

    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 15,
        userId: 7,
        restaurantId: 0,
        status: "expired",
        currentPeriodEnd: "2026-07-01T00:00:00.000Z",
      }),
    ] as never);
    const frozen = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(frozen.meta?.commercialAccountState).toBe("FROZEN");

    vi.mocked(getSubscriptionsByUser).mockResolvedValue([
      commercialTestSubRow({
        id: 15,
        userId: 7,
        restaurantId: 0,
        status: "active",
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      }),
    ] as never);
    const renewed = await resolveOwnerEntitlements(7, {
      now: NOW,
      bypassCache: true,
    });
    expect(renewed.meta?.commercialAccountState).toBe("ACTIVE");
    expect(renewed.entitlements.features.ordering).toBe(true);
  });
});
