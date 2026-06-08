import { describe, expect, it } from "vitest";
import { buildCommercialContext } from "@commercial/commercialContext";
import { getCommercialEntitlementsFromContext } from "@commercial/getCommercialEntitlements";
import { mapToCommercialAuthority } from "./mapToCommercialAuthority";
import type { UserSubscriptionRow } from "../subscriptionResolver";

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

function subRow(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId" | "restaurantId">
): UserSubscriptionRow {
  return {
    planId: 30001,
    status: "active",
    billingCycle: "yearly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: null,
    currentPeriodEnd: new Date(FIXED_NOW.getTime() + 20 * 86400000).toISOString(),
    trialEndsAt: null,
    canceledAt: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("mapToCommercialAuthority", () => {
  it("exposes S1 provenance and entitlements without altering resolver output", () => {
    const context = buildCommercialContext({
      ownerId: 3,
      role: "user",
      subscriptionRow: {
        planId: 30001,
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: new Date(FIXED_NOW.getTime() + 20 * 86400000).toISOString(),
      },
      now: FIXED_NOW,
    });
    const result = getCommercialEntitlementsFromContext(context);
    const row = subRow({ id: 42, userId: 3, restaurantId: 0 });

    const authority = mapToCommercialAuthority(
      result,
      row,
      { id: 30001, nameEn: "Basic", nameAr: "أساسي" },
      FIXED_NOW
    );

    expect(authority.authoritySource).toBe("S1_CANONICAL");
    expect(authority.entitlements).toEqual(result.entitlements);
    expect(authority.maxRestaurants).toBe(result.entitlements.limits.restaurants);
    expect(authority.features).toBe(result.entitlements.features);
    expect(authority.billingCycle).toBe("yearly");
    expect(authority.resolvedAt).toBe(FIXED_NOW.toISOString());
  });
});
