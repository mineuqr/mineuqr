/**
 * COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1
 * Public visibility + governance workflow contracts (no entitlement ownership).
 */

import type { PlanVersionLifecycleState } from "../types/lifecycle";
import { PLAN_SELECTION_VISIBLE_STATES } from "../adoption";

export const COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM =
  "COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1" as const;

/** Architecture governance states overlaid on foundation lifecycle (no DB redesign). */
export const PUBLICATION_WORKFLOW_STATES = [
  "draft",
  "approved",
  "scheduled",
  "published",
  "deprecated",
  "retired",
  "archived",
] as const;

export type PublicationWorkflowState =
  (typeof PUBLICATION_WORKFLOW_STATES)[number];

/** Public browse list — Published only. */
export const PUBLIC_CATALOG_BROWSE_STATES = ["published"] as const;

/** Historically addressable (get-by-id) — not for new adoption. */
export const PUBLIC_CATALOG_HISTORICAL_STATES = ["deprecated"] as const;

/** Never publicly exposed. */
export const PUBLIC_CATALOG_PRIVATE_STATES = [
  "draft",
  "approved",
  "scheduled",
  "retired",
  "archived",
] as const;

export type PublicCatalogVisibility = {
  publiclyBrowsable: boolean;
  historicallyAddressable: boolean;
  openForNewAdoption: boolean;
  publiclyInaccessible: boolean;
};

export function visibilityForWorkflowState(
  state: PublicationWorkflowState
): PublicCatalogVisibility {
  const publiclyBrowsable = (PUBLIC_CATALOG_BROWSE_STATES as readonly string[]).includes(
    state
  );
  const historicallyAddressable = (
    PUBLIC_CATALOG_HISTORICAL_STATES as readonly string[]
  ).includes(state);
  return {
    publiclyBrowsable,
    historicallyAddressable,
    openForNewAdoption: publiclyBrowsable,
    publiclyInaccessible:
      !publiclyBrowsable && !historicallyAddressable,
  };
}

/** Map foundation version state + workflow overlay → public workflow state. */
export function resolvePublicationWorkflowState(input: {
  foundationState: PlanVersionLifecycleState;
  approved?: boolean;
  scheduledEffectiveAt?: string | null;
  archived?: boolean;
  now?: Date;
}): PublicationWorkflowState {
  const { foundationState } = input;
  if (foundationState === "published") return "published";
  if (foundationState === "deprecated") return "deprecated";
  if (foundationState === "retired") {
    return input.archived ? "archived" : "retired";
  }
  // draft
  if (input.scheduledEffectiveAt) {
    const at = new Date(input.scheduledEffectiveAt);
    if (!Number.isNaN(at.getTime()) && (input.now ?? new Date()) < at) {
      return "scheduled";
    }
  }
  if (input.approved) return "approved";
  return "draft";
}

export function assertNotEntitlementSurface(): void {
  // Documentary marker — publishing module must never call subscription-runtime.
}

export const PUBLIC_OFFERING_SCHEMA_VERSION = 1 as const;

export type PublicCatalogOffering = {
  schemaVersion: typeof PUBLIC_OFFERING_SCHEMA_VERSION;
  planId: string;
  planCode: string;
  planName: string;
  planVersionId: string;
  versionCode: string;
  versionName: string;
  workflowState: PublicationWorkflowState;
  visibility: PublicCatalogVisibility;
  currency: string;
  priceMonthly: string | null;
  priceYearly: string | null;
  featureKeys: string[];
  limits: Array<{ limitKey: string; value: number | null; unit: string | null }>;
  trialDurationDays: number | null;
  legacyPlanId: number | null;
  publishedAt: string | null;
};

/** Selection contract remains published-only (adoption). */
export function isStorefrontSelectableState(
  foundationState: PlanVersionLifecycleState
): boolean {
  return (PLAN_SELECTION_VISIBLE_STATES as readonly string[]).includes(
    foundationState
  );
}
