import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../subscriptionResolver";

vi.mock("../db", () => ({
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
}));

import { getUserById, getSubscriptionsByUser } from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

function isoPlusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function subRow(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId" | "restaurantId">
): UserSubscriptionRow {
  return {
    planId: 30002,
    status: "active",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: isoPlusDays(-10),
    currentPeriodEnd: isoPlusDays(20),
    trialEndsAt: null,
    canceledAt: null,
    createdAt: isoPlusDays(-30),
    updatedAt: isoPlusDays(-1),
    ...overrides,
  };
}

describe("getCommercialEntitlements (server integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flows runtime records through adapter to resolver for active professional", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 1, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);

    const result = await getCommercialEntitlements(5, FIXED_NOW);

    expect(result.context.ownerId).toBe(5);
    expect(result.context.role).toBe("user");
    expect(result.context.subscription?.catalogPlan).toBe("PROFESSIONAL");
    expect(result.entitlements.plan).toBe("PROFESSIONAL");
    expect(result.entitlements.accountType).toBe("PAYING");
  });

  it("uses account-level row only (restaurantId = 0)", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 6,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({
        id: 1,
        userId: 6,
        restaurantId: 99,
        planId: 30003,
        status: "active",
      }),
      subRow({
        id: 2,
        userId: 6,
        restaurantId: 0,
        planId: 30001,
        status: "active",
      }),
    ]);

    const result = await getCommercialEntitlements(6, FIXED_NOW);

    expect(result.context.subscription?.catalogPlan).toBe("BASIC");
    expect(result.entitlements.plan).toBe("BASIC");
  });

  it("returns NONE when only restaurant-scoped rows exist", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 7,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 1, userId: 7, restaurantId: 50, planId: 30002 }),
    ]);

    const result = await getCommercialEntitlements(7, FIXED_NOW);

    expect(result.context.subscription).toBeNull();
    expect(result.entitlements.plan).toBe("NONE");
  });

  it("returns ADMIN entitlements for admin users without reading subscription", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      role: "admin",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 1, userId: 1, restaurantId: 0, planId: 30001 }),
    ]);

    const result = await getCommercialEntitlements(1, FIXED_NOW);

    expect(result.context.subscription).toBeNull();
    expect(result.entitlements.plan).toBe("ADMIN");
    expect(getSubscriptionsByUser).not.toHaveBeenCalled();
  });

  it("resolves trial from account-level row", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 8,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({
        id: 1,
        userId: 8,
        restaurantId: 0,
        planId: 30002,
        status: "trial",
        trialEndsAt: isoPlusDays(10),
        currentPeriodEnd: isoPlusDays(10),
      }),
    ]);

    const result = await getCommercialEntitlements(8, FIXED_NOW);

    expect(result.entitlements.plan).toBe("TRIAL");
    expect(result.entitlements.features.reports).toBe(true);
  });
});
