import {
  buildCommercialContext,
  type CommercialContext,
} from "@commercial/commercialContext";
import { mapPlanIdToCatalogPlan } from "@commercial/planIdMapping";
import { getSubscriptionsByUser, getUserById } from "../db";
import { pickUserLevelSubscription } from "../subscriptionResolver";

/**
 * Loads runtime records and builds CommercialContext per PG-1C.2D §3.5.
 * Read-only — no writes.
 */
export async function buildCommercialContextFromDb(
  ownerId: number,
  now: Date = new Date()
): Promise<CommercialContext> {
  const user = await getUserById(ownerId);
  const role = user?.role ?? "user";

  const rows = await getSubscriptionsByUser(ownerId);
  const canonicalRow = pickUserLevelSubscription(rows, now);

  if (!canonicalRow) {
    return buildCommercialContext({ ownerId, role, subscriptionRow: null, now });
  }

  const legacyPlanId =
    typeof canonicalRow.planId === "number"
      ? canonicalRow.planId
      : /^\d+$/.test(String(canonicalRow.planId))
        ? Number(canonicalRow.planId)
        : null;
  let catalogPlan = legacyPlanId != null ? mapPlanIdToCatalogPlan(legacyPlanId) : null;
  if (!catalogPlan && typeof canonicalRow.planId === "string") {
    const { planService, ensureCatalogReady, bridgeByCatalogPlanCode } = await import(
      "../services/commercial-catalog"
    );
    await ensureCatalogReady();
    const live = planService.get(canonicalRow.planId);
    catalogPlan = live
      ? (bridgeByCatalogPlanCode(live.code)?.catalogPlanKey ?? null)
      : null;
  }
  if (!catalogPlan) {
    console.warn(
      `[commercial] Unknown planId ${canonicalRow.planId} for owner ${ownerId}; treating as NONE`
    );
    return buildCommercialContext({ ownerId, role, subscriptionRow: null, now });
  }

  return buildCommercialContext({
    ownerId,
    role,
    subscriptionRow: {
      planId: canonicalRow.planId,
      status: canonicalRow.status,
      trialEndsAt: canonicalRow.trialEndsAt,
      currentPeriodEnd: canonicalRow.currentPeriodEnd,
    },
    now,
  });
}
