import {
  buildCommercialContext,
  type CommercialContext,
} from "@commercial/commercialContext";
import { catalogPlanKeyFromCode } from "@commercial/catalogPlanKey";
import { getSubscriptionsByUser, getUserById } from "../db";
import { pickUserLevelSubscription } from "../subscriptionResolver";

/**
 * Loads runtime records and builds CommercialContext from Live Plan UUID.
 * Integer leftover identity fails closed. Read-only — no writes.
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

  const planId = String(canonicalRow.planId);
  const { planService, ensureCatalogReady, isLivePlanUuid } = await import(
    "../services/commercial-catalog"
  );
  let catalogPlan = catalogPlanKeyFromCode(planId);
  if (!catalogPlan && isLivePlanUuid(planId)) {
    await ensureCatalogReady();
    const live = planService.get(planId);
    catalogPlan = live ? catalogPlanKeyFromCode(live.code) : null;
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
      catalogPlan,
      status: canonicalRow.status,
      trialEndsAt: canonicalRow.trialEndsAt,
      currentPeriodEnd: canonicalRow.currentPeriodEnd,
    },
    now,
  });
}
