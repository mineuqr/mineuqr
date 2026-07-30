/**
 * COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1
 * Public Catalog read model — browse-optimized, Catalog-owned, read-only for consumers.
 * NEVER used for entitlement. NEVER mutates Subscription Snapshots.
 */

import {
  PUBLIC_OFFERING_SCHEMA_VERSION,
  visibilityForWorkflowState,
  type PublicCatalogOffering,
  type PublicationWorkflowState,
  COMMERCIAL_CANONICAL_CURRENCY,
} from "@shared/commercial-catalog";
import { isCommercialCapabilityFilterKey } from "@shared/commercial-capability";
import {
  CommercialCatalogError,
  planService,
  planVersionService,
  pricingService,
  trialPolicyCatalogService,
  commercialCatalogStore,
} from "../../services/commercial-catalog";
import { bridgeByCatalogPlanCode } from "../../services/commercial-catalog/legacyPlanBridge";
import { ensureCatalogReady } from "../../services/commercial-catalog/adoptionService";
import { catalogPublishingService } from "./catalogPublishingService";
import {
  getPublicCatalogCache,
  setPublicCatalogCache,
} from "./publicCatalogCache";

function buildOffering(
  versionId: string,
  workflowState: PublicationWorkflowState
): PublicCatalogOffering | null {
  const version = planVersionService.get(versionId);
  if (!version) return null;
  const plan = planService.get(version.planId);
  if (!plan || plan.isHidden) return null;

  const prices = pricingService.list(version.id);
  const cycles = pricingService.listBillingCycles();
  const monthlyCycle = cycles.find((c) => c.code === "monthly");
  const yearlyCycle = cycles.find((c) => c.code === "yearly");
  const monthly = prices.find((p) => p.billingCycleId === monthlyCycle?.id);
  const yearly = prices.find((p) => p.billingCycleId === yearlyCycle?.id);
  const features = version.featureBundleId
    ? Array.from(commercialCatalogStore.bundleFeatures.values()).filter(
        (f) => f.bundleId === version.featureBundleId && f.included
      )
    : [];
  const limits = version.limitProfileId
    ? Array.from(commercialCatalogStore.limitValues.values()).filter(
        (l) => l.profileId === version.limitProfileId
      )
    : [];
  const trial = version.trialPolicyId
    ? trialPolicyCatalogService.get(version.trialPolicyId)
    : null;
  const bridge = bridgeByCatalogPlanCode(plan.code);

  return {
    schemaVersion: PUBLIC_OFFERING_SCHEMA_VERSION,
    planId: plan.id,
    planCode: plan.code,
    planName: plan.name,
    planVersionId: version.id,
    versionCode: version.versionCode,
    versionName: version.versionName,
    workflowState,
    visibility: visibilityForWorkflowState(workflowState),
    currency:
      monthly?.currency ?? yearly?.currency ?? COMMERCIAL_CANONICAL_CURRENCY,
    priceMonthly: monthly?.amount ?? null,
    priceYearly: yearly?.amount ?? null,
    featureKeys: features
      .map((f) => f.featureKey)
      .filter(isCommercialCapabilityFilterKey),
    limits: limits.map((l) => ({
      limitKey: l.limitKey,
      value: l.value,
      unit: l.unit,
    })),
    trialDurationDays: trial?.durationDays ?? null,
    legacyPlanId: bridge?.legacyPlanId ?? null,
    publishedAt: version.publishedAt ?? null,
  };
}

/**
 * Public browse list — Published only (draft / approved / scheduled / retired / archived excluded).
 */
export function projectPublicCatalogOfferings(): PublicCatalogOffering[] {
  const cached = getPublicCatalogCache();
  if (cached) return cached;

  const offerings: PublicCatalogOffering[] = [];
  for (const version of planVersionService.list()) {
    const status = catalogPublishingService.getStatus(version.id);
    if (!status.visibility.publiclyBrowsable) continue;
    if (status.workflowState !== "published") continue;
    const offering = buildOffering(version.id, "published");
    if (offering) offerings.push(offering);
  }
  offerings.sort((a, b) => a.planCode.localeCompare(b.planCode));
  setPublicCatalogCache(offerings);
  return offerings;
}

export async function listPublicCatalogOfferings(): Promise<
  PublicCatalogOffering[]
> {
  await ensureCatalogReady();
  return projectPublicCatalogOfferings();
}

/**
 * Get by published version id.
 * - published → OK (browse + adoption)
 * - deprecated → historically addressable (not open for new adoption)
 * - archived / draft / retired / approved / scheduled → not found (inaccessible)
 */
export function projectPublicCatalogOffering(
  planVersionId: string
): PublicCatalogOffering {
  const version = planVersionService.get(planVersionId);
  if (!version) {
    throw new CommercialCatalogError("Version not found", "not_found");
  }
  const status = catalogPublishingService.getStatus(planVersionId);
  if (
    !status.visibility.publiclyBrowsable &&
    !status.visibility.historicallyAddressable
  ) {
    throw new CommercialCatalogError(
      "Offering is not publicly accessible",
      "not_found"
    );
  }
  const offering = buildOffering(planVersionId, status.workflowState);
  if (!offering) {
    throw new CommercialCatalogError(
      "Offering is not publicly accessible",
      "not_found"
    );
  }
  return offering;
}

export async function getPublicCatalogOffering(
  planVersionId: string
): Promise<PublicCatalogOffering> {
  await ensureCatalogReady();
  return projectPublicCatalogOffering(planVersionId);
}

/** Version visibility metadata for public consumers (no draft internals). */
export async function getPublicVersionVisibility(planVersionId: string): Promise<{
  planVersionId: string;
  workflowState: PublicationWorkflowState;
  visibility: PublicCatalogOffering["visibility"];
  versionCode: string | null;
  versionName: string | null;
  publishedAt: string | null;
}> {
  await ensureCatalogReady();
  const version = planVersionService.get(planVersionId);
  if (!version) {
    throw new CommercialCatalogError("Version not found", "not_found");
  }
  const status = catalogPublishingService.getStatus(planVersionId);
  if (
    !status.visibility.publiclyBrowsable &&
    !status.visibility.historicallyAddressable
  ) {
    throw new CommercialCatalogError(
      "Version is not publicly visible",
      "not_found"
    );
  }
  return {
    planVersionId,
    workflowState: status.workflowState,
    visibility: status.visibility,
    versionCode: version.versionCode,
    versionName: version.versionName,
    publishedAt: version.publishedAt ?? null,
  };
}

export function assertPublicCatalogNotEntitlementAuthority(): {
  entitlementAuthority: "subscription-runtime";
  publishedCatalogParticipatesInEntitlement: false;
  runtimeConsumesMutableCatalog: false;
} {
  return {
    entitlementAuthority: "subscription-runtime",
    publishedCatalogParticipatesInEntitlement: false,
    runtimeConsumesMutableCatalog: false,
  };
}
