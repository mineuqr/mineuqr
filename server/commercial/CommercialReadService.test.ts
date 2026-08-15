import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UserSubscriptionRow } from "../subscriptionResolver";

vi.mock("../db", () => ({
  getDb: vi.fn(async () => null),
  getUserById: vi.fn(),
  getSubscriptionsByUser: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
}));

import {
  getSubscriptionPlanById,
  getSubscriptionsByUser,
  getUserById,
} from "../db";
import { commercialReadService } from "./CommercialReadService";
import { mapToCommercialAuthority } from "./mapToCommercialAuthority";
import { getCommercialEntitlementsFromContext } from "@commercial/getCommercialEntitlements";
import { buildCommercialContext } from "@commercial/commercialContext";

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

describe("CommercialReadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAuthorityForOwner resolves account-scoped subscription and entitlements", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      role: "user",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      subRow({ id: 10, userId: 5, restaurantId: 0, planId: 30002 }),
    ]);
    (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 30002,
      nameEn: "Professional",
      nameAr: "احترافي",
    });

    const authority = await commercialReadService.getAuthorityForOwner(5, FIXED_NOW);

    expect(authority.ownerId).toBe(5);
    expect(authority.role).toBe("user");
    expect(authority.subscriptionId).toBe(10);
    expect(authority.planCode).toBe("PROFESSIONAL");
    expect(authority.planName).toBe("Professional");
    expect(authority.authoritySource).toBe("S1_CANONICAL");
    expect(authority.entitlements.features.ordering).toBe(true);
    expect(authority.commercialStatus.isEntitled).toBe(true);
    expect(authority.commercialStatus.countsInMrr).toBe(true);
  });

  it("ignores scoped rows when no account row exists", async () => {
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
    ]);

    const authority = await commercialReadService.getAuthorityForOwner(6, FIXED_NOW);

    expect(authority.subscriptionId).toBeNull();
    expect(authority.planCode).toBe("NONE");
    expect(authority.commercialStatus.isEntitled).toBe(false);
    expect(getSubscriptionPlanById).not.toHaveBeenCalled();
  });

  it("returns NONE for admin role without subscription (ADMIN-AUTH-1C)", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      role: "admin",
    });
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const authority = await commercialReadService.getAuthorityForOwner(1, FIXED_NOW);

    expect(authority.role).toBe("admin");
    expect(authority.planCode).toBe("NONE");
    expect(authority.commercialStatus.isEntitled).toBe(false);
  });
});

describe("mapToCommercialAuthority", () => {
  it("maps trial days remaining from canonical row", () => {
    const context = buildCommercialContext({
      ownerId: 7,
      role: "user",
      subscriptionRow: {
        planId: 30001,
        status: "trial",
        trialEndsAt: isoPlusDays(5),
        currentPeriodEnd: null,
      },
      now: FIXED_NOW,
    });
    const result = getCommercialEntitlementsFromContext(context);
    const row = subRow({
      id: 20,
      userId: 7,
      restaurantId: 0,
      planId: 30001,
      status: "trial",
      trialEndsAt: isoPlusDays(5),
    });

    const authority = mapToCommercialAuthority(
      result,
      row,
      { id: 30001, nameEn: "Basic", nameAr: "أساسي" },
      FIXED_NOW
    );

    expect(authority.planCode).toBe("TRIAL");
    expect(authority.trialStatus.isTrial).toBe(true);
    expect(authority.trialStatus.daysRemaining).toBe(5);
    expect(authority.billingCycle).toBe("monthly");
  });
});
