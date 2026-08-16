/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
 * Effective POS Entitlement is derived — not a second SSOT.
 */

export type EffectivePosEntitlement = {
  included: number | null;
  provisioned: number;
  remaining: number | null;
  available: boolean;
  provisioningAllowed: boolean;
  source: "live_plan_limit" | "missing_fail_closed" | "owner_unlimited";
};

export function deriveEffectivePosEntitlement(input: {
  included: number | null;
  provisioned: number;
  source: EffectivePosEntitlement["source"];
}): EffectivePosEntitlement {
  const provisioned = Math.max(0, input.provisioned);
  if (input.included === null) {
    return {
      included: null,
      provisioned,
      remaining: null,
      available: true,
      provisioningAllowed: true,
      source: input.source,
    };
  }
  const included = Math.max(0, input.included);
  const remaining = Math.max(0, included - provisioned);
  return {
    included,
    provisioned,
    remaining,
    available: included > 0,
    provisioningAllowed: remaining > 0,
    source: input.source,
  };
}
