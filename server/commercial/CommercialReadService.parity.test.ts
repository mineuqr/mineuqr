/**
 * EXEC-2 — Authority parity validation (read-only, mocked DB).
 * Compares CommercialReadService vs existing authority consumers.
 * Documents expected MATCH and MISMATCH — does not fix mismatches.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { isSubscriptionActive } from "../db";
import { resolvePlanLimitsForUser } from "../subscriptionPlanLimits";
import type { UserSubscriptionRow } from "../subscriptionResolver";
import { commercialReadService } from "./CommercialReadService";
import { getCommercialEntitlements } from "./getCommercialEntitlements";
import { resolveGuestOrderingAllowed } from "./guestOrderingAuthority";
import { resolveTrialStatusRead } from "./wave1ReadAuthority";

vi.mock("../db", () => ({
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  getRestaurantsByUser: vi.fn(async () => []),
  getRestaurantById: vi.fn(),
  isSubscriptionActive: vi.fn(),
  getTrialEndDate: vi.fn(),
}));

vi.mock("../services/commercial-catalog", () => ({
  getSubscriptionCommercialBinding: vi.fn(async () => null),
  resolveLivePlanDisplayByLegacyId: vi.fn(async (id: number) => ({
    id,
    nameEn: "Professional",
    nameAr: "احترافي",
  })),
  resolveLivePlanCapabilities: vi.fn(async () => ({
    source: "missing",
    planId: null,
    catalogPlanCode: null,
    featureKeys: [],
    limits: [],
    chargedTerms: null,
  })),
}));

import {
  getRestaurantById,
  getSubscriptionPlanById,
  getSubscriptionsByUser,
  getSubscriptionPlans,
  getUserById,
} from "../db";
import { pickCanonicalSubscription } from "../subscriptionResolver";
import {
  COMMERCIAL_PLAN_CATALOG,
  COMMERCIAL_TEST_NOW,
  commercialTestSubRow,
  installCommercialTestClock,
  isoPlusDaysFromCommercialTestNow,
  legacyEntitlementActive,
} from "./__tests__/commercialTestFixtures";

const FIXED_NOW = COMMERCIAL_TEST_NOW;
const PLAN_CATALOG = COMMERCIAL_PLAN_CATALOG;

function isoPlusDays(days: number): string {
  return isoPlusDaysFromCommercialTestNow(days);
}

function subRow(overrides: Parameters<typeof commercialTestSubRow>[0]) {
  return commercialTestSubRow(overrides);
}

function setupPlansMock() {
  (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockImplementation(
    async (id: number) => PLAN_CATALOG[id as keyof typeof PLAN_CATALOG]
  );
  (getSubscriptionPlans as ReturnType<typeof vi.fn>).mockResolvedValue(
    Object.values(PLAN_CATALOG)
  );
}

function setupUserSubs(userId: number, rows: UserSubscriptionRow[]) {
  (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
    if (id === userId) return { id: userId, role: "user" };
    if (id === 1) return { id: 1, role: "admin" };
    return { id, role: "user" };
  });
  (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(
    async (id: number) => (id === userId ? rows : [])
  );
  (isSubscriptionActive as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
    const userRows = id === userId ? rows : [];
    return legacyEntitlementActive(userRows);
  });
}

/** Replicates getAllUsersWithSubscriptions first-row pick (S5). */
function legacyUserListPick(
  userId: number,
  allSubs: UserSubscriptionRow[]
): UserSubscriptionRow | null {
  return allSubs.find((s) => s.userId === userId) ?? null;
}

describe("EXEC-2 CommercialReadService parity — MATCH (S1-aligned consumers)", () => {
  installCommercialTestClock();

  beforeEach(() => {
    vi.clearAllMocks();
    setupPlansMock();
  });

  it("CommercialReadService entitlements match getCommercialEntitlements", async () => {
    const userId = 5;
    setupUserSubs(userId, [
      subRow({ id: 10, userId, restaurantId: 0, planId: 30002 }),
    ]);

    const [authority, direct] = await Promise.all([
      commercialReadService.getAuthorityForOwner(userId, FIXED_NOW),
      getCommercialEntitlements(userId, FIXED_NOW),
    ]);

    expect(authority.entitlements).toEqual(direct.entitlements);
    expect(authority.planCode).toBe(direct.entitlements.plan);
    expect(authority.subscriptionStatus).toBe(direct.entitlements.status);
    expect(authority.maxRestaurants).toBe(direct.entitlements.limits.restaurants);
    expect(authority.features).toEqual(direct.entitlements.features);
  });

  it("resolveGuestOrderingAllowed matches authority.features.ordering", async () => {
    const userId = 7;
    const restaurantId = 50;
    setupUserSubs(userId, [
      subRow({ id: 1, userId, restaurantId: 0, planId: 30002, status: "trial" }),
    ]);
    (getRestaurantById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: restaurantId,
      userId,
    });

    const authority = await commercialReadService.getAuthorityForOwner(userId, FIXED_NOW);
    const ordering = await resolveGuestOrderingAllowed(restaurantId, FIXED_NOW);

    expect(ordering.canOrder).toBe(authority.features.ordering);
  });

  it("account-level trial: resolveTrialStatusRead matches authority when no legacy fallback", async () => {
    const userId = 8;
    const trialEnd = isoPlusDays(10);
    setupUserSubs(userId, [
      subRow({
        id: 1,
        userId,
        restaurantId: 0,
        planId: 30002,
        status: "trial",
        trialEndsAt: trialEnd,
        currentPeriodEnd: trialEnd,
      }),
    ]);

    const authority = await commercialReadService.getAuthorityForOwner(userId, FIXED_NOW);
    const trial = await resolveTrialStatusRead(userId, FIXED_NOW);

    expect(authority.trialStatus.isTrial).toBe(true);
    expect(trial.isActive).toBe(authority.commercialStatus.isEntitled);
    expect(authority.planCode).toBe("TRIAL");
  });

  it("admin role without subscription resolves NONE (ADMIN-AUTH-1C)", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, role: "admin" });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const authority = await commercialReadService.getAuthorityForOwner(1, FIXED_NOW);
    const direct = await getCommercialEntitlements(1, FIXED_NOW);

    expect(authority.planCode).toBe("NONE");
    expect(direct.entitlements.plan).toBe("NONE");
    expect(authority.entitlements).toEqual(direct.entitlements);
  });
});

describe("EXEC-2 CommercialReadService parity — MISMATCH (legacy consumers)", () => {
  installCommercialTestClock();

  beforeEach(() => {
    vi.clearAllMocks();
    setupPlansMock();
  });

  it("scoped-only: isSubscriptionActive true but CommercialReadService not entitled", async () => {
    const userId = 14760004;
    setupUserSubs(userId, [
      subRow({ id: 600002, userId, restaurantId: 720006, planId: 30002 }),
    ]);

    const authority = await commercialReadService.getAuthorityForOwner(userId, FIXED_NOW);
    const legacyActive = await isSubscriptionActive(userId);

    expect(legacyActive).toBe(true);
    expect(authority.commercialStatus.isEntitled).toBe(false);
    expect(authority.planCode).toBe("NONE");
  });

  it("scoped-only: getCanonicalUserSubscription returns row but CRS has no subscriptionId", async () => {
    const userId = 6;
    const rows = [
      subRow({ id: 1, userId, restaurantId: 99, planId: 30002, status: "active" }),
    ];
    setupUserSubs(userId, rows);

    const authority = await commercialReadService.getAuthorityForOwner(userId, FIXED_NOW);
    const legacySub = pickCanonicalSubscription(rows);

    expect(legacySub?.planId).toBe(30002);
    expect(authority.subscriptionId).toBeNull();
    expect(authority.planCode).toBe("NONE");
  });

  it("scoped-only trial: resolveTrialStatusRead active via fallback, CRS not trial", async () => {
    const userId = 7;
    const trialEnd = isoPlusDays(10);
    setupUserSubs(userId, [
      subRow({
        id: 1,
        userId,
        restaurantId: 50,
        planId: 30002,
        status: "trial",
        trialEndsAt: trialEnd,
        currentPeriodEnd: trialEnd,
      }),
    ]);

    const authority = await commercialReadService.getAuthorityForOwner(userId, FIXED_NOW);
    const trial = await resolveTrialStatusRead(userId, FIXED_NOW);

    expect(trial.isActive).toBe(true);
    expect(authority.trialStatus.isTrial).toBe(false);
    expect(authority.planCode).toBe("NONE");
  });

  it("multi-scoped: resolvePlanLimitsForUser and CRS both use account hub (NONE)", async () => {
    const userId = 14760004;
    const restaurantId = 720006;
    setupUserSubs(userId, [
      subRow({ id: 600002, userId, restaurantId, planId: 30002 }),
      subRow({ id: 630001, userId, restaurantId: 720003, planId: 30001 }),
    ]);

    const authority = await commercialReadService.getAuthorityForOwner(userId, FIXED_NOW);
    const limits = await resolvePlanLimitsForUser(userId, restaurantId);

    expect(limits.maxRestaurants).toBe(0);
    expect(authority.maxRestaurants).toBe(0);
    expect(authority.planCode).toBe("NONE");
  });

  it("S5 user list pick: first row may differ from CRS canonical plan", async () => {
    const userId = 14760004;
    const rows = [
      subRow({ id: 630001, userId, restaurantId: 720003, planId: 30001 }),
      subRow({ id: 600002, userId, restaurantId: 720006, planId: 30002 }),
    ];
    setupUserSubs(userId, rows);

    const authority = await commercialReadService.getAuthorityForOwner(userId, FIXED_NOW);
    const picked = legacyUserListPick(userId, rows);

    expect(picked?.planId).toBe(30001);
    expect(authority.planCode).toBe("NONE");
  });

  it("scoped-only rows do not make CRS countsInMrr", async () => {
    const userId = 14760004;
    const rows = [
      subRow({ id: 630001, userId, restaurantId: 720003, planId: 30001 }),
      subRow({ id: 630002, userId, restaurantId: 720005, planId: 30001 }),
      subRow({ id: 600002, userId, restaurantId: 720006, planId: 30002 }),
    ];
    setupUserSubs(userId, rows);

    const authority = await commercialReadService.getAuthorityForOwner(userId, FIXED_NOW);

    expect(authority.commercialStatus.countsInMrr).toBe(false);
    expect(authority.planCode).toBe("NONE");
    expect(rows.filter((r) => r.status === "active").length).toBe(3);
  });
});
