/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Loads the bound live plan + charged terms. Capabilities come from the live plan.
 */

import type { CommercialChargedTerms } from "@shared/commercial-catalog";
import {
  getSubscriptionCommercialBinding,
  resolveLivePlanCapabilities,
} from "../services/commercial-catalog";

export type LoadedLivePlan = {
  subscriptionId: number;
  planId: string;
  catalogPlanCode: string;
  legacyPlanId: number | null;
  featureKeys: string[];
  limits: { limitKey: string; value: number | null; unit: string | null }[];
  chargedTerms: CommercialChargedTerms | null;
};

export type LivePlanLoadResult =
  | { ok: true; binding: true; data: LoadedLivePlan }
  | { ok: false; binding: false; reason: "no_binding" }
  | {
      ok: false;
      binding: true;
      reason: "live_plan_unreadable";
      planId: string;
      legacyPlanId: number | null;
    };

export async function loadBoundLivePlan(
  subscriptionId: number
): Promise<LivePlanLoadResult> {
  const binding = await getSubscriptionCommercialBinding(subscriptionId);
  if (!binding) {
    return { ok: false, binding: false, reason: "no_binding" };
  }

  const facts = await resolveLivePlanCapabilities(subscriptionId);
  if (facts.source !== "live_plan" || !facts.planId || !facts.catalogPlanCode) {
    return {
      ok: false,
      binding: true,
      reason: "live_plan_unreadable",
      planId: binding.planId,
      legacyPlanId: binding.legacyPlanId,
    };
  }

  return {
    ok: true,
    binding: true,
    data: {
      subscriptionId,
      planId: facts.planId,
      catalogPlanCode: facts.catalogPlanCode,
      legacyPlanId: binding.legacyPlanId,
      featureKeys: facts.featureKeys,
      limits: facts.limits,
      chargedTerms: facts.chargedTerms,
    },
  };
}
