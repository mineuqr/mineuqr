/**
 * COMMERCIAL-FROZEN-ACCOUNT-STATE-1
 * Derived commercial account state. Not a second entitlement resolver.
 */

export const COMMERCIAL_ACCOUNT_STATES = ["ACTIVE", "FROZEN", "NONE"] as const;
export type CommercialAccountState = (typeof COMMERCIAL_ACCOUNT_STATES)[number];

export type CommercialAccountStateDecision = {
  state: CommercialAccountState;
  reason: string;
};

/**
 * Account-level commercial lifecycle (CE-24).
 * Owner exemption and entitlement enablement come from the existing hub inputs.
 */
export function deriveCommercialAccountState(input: {
  ownerExempt: boolean;
  hasCanonicalCustomerSubscription: boolean;
  entitlementsEnabled: boolean;
}): CommercialAccountStateDecision {
  if (input.ownerExempt) {
    return { state: "ACTIVE", reason: "platform_owner_exempt" };
  }
  if (input.entitlementsEnabled) {
    return { state: "ACTIVE", reason: "commercial_entitlements_enabled" };
  }
  if (input.hasCanonicalCustomerSubscription) {
    return { state: "FROZEN", reason: "commercial_access_expired" };
  }
  return { state: "NONE", reason: "no_customer_subscription" };
}

export function isFrozenCommercialAccountState(
  state: CommercialAccountState | string | null | undefined
): boolean {
  return state === "FROZEN";
}
