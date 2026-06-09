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

  const catalogPlan = mapPlanIdToCatalogPlan(canonicalRow.planId);
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
