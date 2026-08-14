/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Bridge: legacy subscription_plans.id ↔ Live Plan Identity.
 * Catalog is SSOT; legacy IDs remain for payment/activation compatibility only.
 */

export type LegacyPlanBridgeEntry = {
  legacyPlanId: number;
  catalogPlanCode: string;
  catalogPlanName: string;
  catalogPlanKey: "BASIC" | "PROFESSIONAL" | "ENTERPRISE";
};

/** Normative bridge aligned with planIdMapping (30001–30003). */
export const LEGACY_PLAN_BRIDGE: readonly LegacyPlanBridgeEntry[] = [
  {
    legacyPlanId: 30001,
    catalogPlanCode: "basic",
    catalogPlanName: "Basic",
    catalogPlanKey: "BASIC",
  },
  {
    legacyPlanId: 30002,
    catalogPlanCode: "professional",
    catalogPlanName: "Professional",
    catalogPlanKey: "PROFESSIONAL",
  },
  {
    legacyPlanId: 30003,
    catalogPlanCode: "enterprise",
    catalogPlanName: "Enterprise",
    catalogPlanKey: "ENTERPRISE",
  },
] as const;

export function bridgeByLegacyPlanId(
  legacyPlanId: number
): LegacyPlanBridgeEntry | null {
  return LEGACY_PLAN_BRIDGE.find((e) => e.legacyPlanId === legacyPlanId) ?? null;
}

export function bridgeByCatalogPlanCode(
  code: string
): LegacyPlanBridgeEntry | null {
  return (
    LEGACY_PLAN_BRIDGE.find(
      (e) => e.catalogPlanCode.toLowerCase() === code.toLowerCase()
    ) ?? null
  );
}
