/**
 * COMMERCIAL-FROZEN-ACCOUNT-STATE-1 — derived ACTIVE / FROZEN / NONE matrix.
 */
import { describe, expect, it } from "vitest";
import {
  deriveCommercialAccountState,
  isFrozenCommercialAccountState,
} from "../commercialAccountState";

describe("deriveCommercialAccountState", () => {
  it("keeps Platform Owner ACTIVE regardless of customer subscription inputs", () => {
    expect(
      deriveCommercialAccountState({
        ownerExempt: true,
        hasCanonicalCustomerSubscription: true,
        entitlementsEnabled: false,
      })
    ).toEqual({ state: "ACTIVE", reason: "platform_owner_exempt" });
  });

  it("maps enabled commercial entitlements to ACTIVE", () => {
    expect(
      deriveCommercialAccountState({
        ownerExempt: false,
        hasCanonicalCustomerSubscription: true,
        entitlementsEnabled: true,
      })
    ).toEqual({ state: "ACTIVE", reason: "commercial_entitlements_enabled" });
  });

  it("maps expired paid / trial access with a canonical row to FROZEN", () => {
    expect(
      deriveCommercialAccountState({
        ownerExempt: false,
        hasCanonicalCustomerSubscription: true,
        entitlementsEnabled: false,
      })
    ).toEqual({ state: "FROZEN", reason: "commercial_access_expired" });
  });

  it("does not freeze an account that never had a canonical customer subscription", () => {
    expect(
      deriveCommercialAccountState({
        ownerExempt: false,
        hasCanonicalCustomerSubscription: false,
        entitlementsEnabled: false,
      })
    ).toEqual({ state: "NONE", reason: "no_customer_subscription" });
  });

  it("lets an active paid subscription supersede an expired trial (enabled entitlements)", () => {
    const decision = deriveCommercialAccountState({
      ownerExempt: false,
      hasCanonicalCustomerSubscription: true,
      entitlementsEnabled: true,
    });
    expect(decision.state).toBe("ACTIVE");
    expect(isFrozenCommercialAccountState(decision.state)).toBe(false);
  });
});

describe("isFrozenCommercialAccountState", () => {
  it("is true only for FROZEN", () => {
    expect(isFrozenCommercialAccountState("FROZEN")).toBe(true);
    expect(isFrozenCommercialAccountState("ACTIVE")).toBe(false);
    expect(isFrozenCommercialAccountState("NONE")).toBe(false);
    expect(isFrozenCommercialAccountState(null)).toBe(false);
  });
});
