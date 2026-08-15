import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseStoredUtcInstant } from "@shared/utils/timezone";
import { userHasSubscriptionEntitlement } from "../subscriptionEntitlement";
import {
  pickCanonicalSubscription,
  type UserSubscriptionRow,
} from "../subscriptionResolver";

const subscriptionRowsByUser = new Map<number, UserSubscriptionRow[]>();
const restaurantsById = new Map<number, { id: number; userId: number }>();

vi.mock("../db", () => ({
  getUserById: vi.fn(async (userId: number) => {
    if (subscriptionRowsByUser.has(userId)) {
      return { id: userId, role: "user" };
    }
    return null;
  }),
  getSubscriptionsByUser: vi.fn(async (userId: number) => {
    return subscriptionRowsByUser.get(userId) ?? [];
  }),
  getRestaurantById: vi.fn(async (restaurantId: number) => {
    return restaurantsById.get(restaurantId);
  }),
  isSubscriptionActive: vi.fn(async (userId: number) => {
    const rows = subscriptionRowsByUser.get(userId) ?? [];
    return userHasSubscriptionEntitlement(rows);
  }),
  getTrialEndDate: vi.fn(async (userId: number) => {
    const rows = subscriptionRowsByUser.get(userId) ?? [];
    const trial = pickCanonicalSubscription(rows.filter((r) => r.status === "trial"));
    return trial ? parseStoredUtcInstant(trial.trialEndsAt) : null;
  }),
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

import { getTrialEndDate, isSubscriptionActive } from "../db";
import { resolveTrialStatusRead } from "./wave1ReadAuthority";
import { resolveGuestOrderingAllowed } from "./guestOrderingAuthority";
import {
  COMMERCIAL_TEST_NOW,
  commercialTestSubRow,
  installCommercialTestClock,
  isoPlusDaysFromCommercialTestNow,
} from "./__tests__/commercialTestFixtures";

const FIXED_NOW = COMMERCIAL_TEST_NOW;

function isoPlusDays(days: number): string {
  return isoPlusDaysFromCommercialTestNow(days);
}

function subRow(overrides: Parameters<typeof commercialTestSubRow>[0]) {
  return commercialTestSubRow({
    status: "trial",
    currentPeriodStart: isoPlusDays(-5),
    currentPeriodEnd: isoPlusDays(10),
    trialEndsAt: isoPlusDays(10),
    createdAt: isoPlusDays(-5),
    ...overrides,
  });
}

describe("ASN-5 authority integration", () => {
  installCommercialTestClock();

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionRowsByUser.clear();
    restaurantsById.clear();
  });

  it("account-level trial: resolveTrialStatusRead uses context trialEndsAt", async () => {
    const userId = 8;
    const trialEnd = isoPlusDays(10);
    subscriptionRowsByUser.set(userId, [
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

    const wave1 = await resolveTrialStatusRead(userId, FIXED_NOW);
    expect(wave1.isActive).toBe(true);
    expect(wave1.trialEndDate?.toISOString()).toBe(trialEnd);
  });

  it("account-level trial: resolveGuestOrderingAllowed allows ordering", async () => {
    const userId = 7;
    const restaurantId = 50;
    subscriptionRowsByUser.set(userId, [
      subRow({ id: 1, userId, restaurantId: 0, planId: 30002, status: "trial" }),
    ]);
    restaurantsById.set(restaurantId, { id: restaurantId, userId });

    expect((await resolveGuestOrderingAllowed(restaurantId, FIXED_NOW)).canOrder).toBe(
      true
    );
  });

  it("account-level BASIC: resolveGuestOrderingAllowed follows live/legacy entitlements", async () => {
    const userId = 9;
    const restaurantId = 10;
    subscriptionRowsByUser.set(userId, [
      subRow({
        id: 1,
        userId,
        restaurantId: 0,
        planId: 30001,
        status: "active",
        trialEndsAt: null,
      }),
    ]);
    restaurantsById.set(restaurantId, { id: restaurantId, userId });

    // Unbound BASIC uses the Legacy Bridge matrix (ordering is a Basic projection).
    expect((await resolveGuestOrderingAllowed(restaurantId, FIXED_NOW)).canOrder).toBe(
      true
    );
  });

  it("scoped-only row: ordering denied (canonical authority ignores scoped)", async () => {
    const userId = 7;
    const restaurantId = 50;
    subscriptionRowsByUser.set(userId, [
      subRow({ id: 1, userId, restaurantId, planId: 30002, status: "trial" }),
    ]);
    restaurantsById.set(restaurantId, { id: restaurantId, userId });

    expect((await resolveGuestOrderingAllowed(restaurantId, FIXED_NOW)).canOrder).toBe(
      false
    );
  });

  it("expired trial: resolveTrialStatusRead inactive", async () => {
    const userId = 99;
    subscriptionRowsByUser.set(userId, [
      subRow({
        id: 1,
        userId,
        restaurantId: 0,
        planId: 30002,
        status: "trial",
        trialEndsAt: isoPlusDays(-1),
        currentPeriodEnd: isoPlusDays(-1),
      }),
    ]);

    const wave1 = await resolveTrialStatusRead(userId, FIXED_NOW);
    expect(wave1.isActive).toBe(false);
  });

  it("scoped-only trial: resolveTrialStatusRead still falls back to legacy isActive", async () => {
    const userId = 7;
    subscriptionRowsByUser.set(userId, [
      subRow({ id: 1, userId, restaurantId: 50, planId: 30002, status: "trial" }),
    ]);

    const wave1 = await resolveTrialStatusRead(userId, FIXED_NOW);
    const legacyActive = await isSubscriptionActive(userId);
    const legacyTrialEnd = await getTrialEndDate(userId);

    expect(wave1.isActive).toBe(legacyActive);
    expect(wave1.trialEndDate?.toISOString()).toBe(legacyTrialEnd?.toISOString());
    expect(wave1.isActive).toBe(true);
  });
});
