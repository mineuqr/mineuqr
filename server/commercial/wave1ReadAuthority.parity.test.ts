import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseStoredUtcInstant } from "@shared/utils/timezone";
import {
  resolveTableOrderingEntitlement,
  userHasSubscriptionEntitlement,
} from "../subscriptionEntitlement";
import {
  pickCanonicalSubscription,
  resolveOrderingSubscriptionRow,
  type UserSubscriptionRow,
} from "../subscriptionResolver";

/**
 * PG-1C.4D — integration parity: Wave 1 read output must match pre-4C legacy
 * for register-path (restaurant-scoped) and account-level scenarios.
 */

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
  getSubscriptionPlanById: vi.fn(async (planId: number) => ({ id: planId })),
  isSubscriptionActive: vi.fn(async (userId: number) => {
    const rows = subscriptionRowsByUser.get(userId) ?? [];
    return userHasSubscriptionEntitlement(rows);
  }),
  getTrialEndDate: vi.fn(async (userId: number) => {
    const rows = subscriptionRowsByUser.get(userId) ?? [];
    const trial = pickCanonicalSubscription(rows.filter((r) => r.status === "trial"));
    return trial ? parseStoredUtcInstant(trial.trialEndsAt) : null;
  }),
  restaurantAllowsTableOrdering: vi.fn(async (restaurantId: number) => {
    const restaurant = restaurantsById.get(restaurantId);
    if (!restaurant) return false;
    const rows = subscriptionRowsByUser.get(restaurant.userId) ?? [];
    const subscription = resolveOrderingSubscriptionRow(restaurantId, rows);
    const plan = subscription ? { id: subscription.planId } : null;
    return resolveTableOrderingEntitlement(subscription, plan).isEntitled;
  }),
}));

import {
  getTrialEndDate,
  isSubscriptionActive,
  restaurantAllowsTableOrdering,
} from "../db";
import { resolveCanOrderRead, resolveTrialStatusRead } from "./wave1ReadAuthority";

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

function isoPlusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function subRow(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId" | "restaurantId">
): UserSubscriptionRow {
  return {
    planId: 30002,
    status: "trial",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: isoPlusDays(-5),
    currentPeriodEnd: isoPlusDays(10),
    trialEndsAt: isoPlusDays(10),
    canceledAt: null,
    createdAt: isoPlusDays(-5),
    updatedAt: isoPlusDays(-1),
    ...overrides,
  };
}

describe("wave1ReadAuthority parity (PG-1C.4D)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionRowsByUser.clear();
    restaurantsById.clear();
  });

  it("register-path trial: resolveTrialStatusRead matches legacy isActive + trialEnd", async () => {
    const userId = 7;
    const restaurantId = 50;
    subscriptionRowsByUser.set(userId, [
      subRow({ id: 1, userId, restaurantId, planId: 30002, status: "trial" }),
    ]);

    const wave1 = await resolveTrialStatusRead(userId, FIXED_NOW);
    const legacyActive = await isSubscriptionActive(userId);
    const legacyTrialEnd = await getTrialEndDate(userId);

    expect(wave1.isActive).toBe(legacyActive);
    expect(wave1.trialEndDate?.toISOString()).toBe(legacyTrialEnd?.toISOString());
    expect(wave1.isActive).toBe(true);
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

  it("register-path ordering: resolveCanOrderRead matches legacy restaurantAllowsTableOrdering", async () => {
    const userId = 7;
    const restaurantId = 50;
    subscriptionRowsByUser.set(userId, [
      subRow({ id: 1, userId, restaurantId, planId: 30002, status: "trial" }),
    ]);
    restaurantsById.set(restaurantId, { id: restaurantId, userId });

    const wave1 = await resolveCanOrderRead(restaurantId, FIXED_NOW);
    const legacy = await restaurantAllowsTableOrdering(restaurantId);

    expect(wave1.canOrder).toBe(legacy);
    expect(wave1.canOrder).toBe(true);
  });

  it("account-level BASIC: resolveCanOrderRead matches legacy when no restaurant override", async () => {
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

    const wave1 = await resolveCanOrderRead(restaurantId, FIXED_NOW);
    const legacy = await restaurantAllowsTableOrdering(restaurantId);

    expect(wave1.canOrder).toBe(legacy);
    expect(wave1.canOrder).toBe(false);
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
});
