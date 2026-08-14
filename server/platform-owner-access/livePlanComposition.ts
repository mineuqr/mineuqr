/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Current Live Plan composition by catalog code — no binding, no snapshot.
 */

import {
  ensureCatalogReady,
  featureBundleService,
  limitProfileService,
  planService,
} from "../services/commercial-catalog";

export type LivePlanComposition = {
  planId: string;
  catalogPlanCode: string;
  commercialName: string;
  featureKeys: string[];
  limits: { limitKey: string; value: number | null; unit: string | null }[];
};

export async function getCurrentLivePlanCompositionByCode(
  planCode: string
): Promise<LivePlanComposition | null> {
  await ensureCatalogReady();
  const plan = planService.getByCode(planCode.trim());
  if (!plan || plan.isHidden) return null;

  const features = plan.featureBundleId
    ? featureBundleService
        .listFeatures(plan.featureBundleId)
        .filter((f) => f.included)
        .map((f) => f.featureKey)
    : [];
  const limits = plan.limitProfileId
    ? limitProfileService.listValues(plan.limitProfileId).map((l) => ({
        limitKey: l.limitKey,
        value: l.value,
        unit: l.unit,
      }))
    : [];

  return {
    planId: plan.id,
    catalogPlanCode: plan.code,
    commercialName: plan.name,
    featureKeys: features,
    limits,
  };
}

export async function listCurrentLivePlansForSimulation(): Promise<
  Array<{ code: string; name: string }>
> {
  await ensureCatalogReady();
  return planService
    .list()
    .filter((p) => !p.isHidden)
    .map((p) => ({ code: p.code, name: p.name }));
}
