/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1 — domain services.
 * Live plans: Edit → Validate → Atomic Save → Cache invalidation.
 */

import {
  validateLivePlanSave,
  validateLivePlanLimitValues,
  type CommercialBillingCycle,
  type CommercialCatalogHealth,
  type CommercialFeatureBundle,
  type CommercialLimitProfile,
  type CommercialLivePlan,
  type CommercialMigrationPolicy,
  type CommercialPrice,
  type CommercialPromotion,
  type CommercialRegion,
  type CommercialTrialPolicy,
  type PlanSaveValidationResult,
  COMMERCIAL_LIVE_PLANS_PROGRAM,
} from "@shared/commercial-catalog";
import {
  assertCommercialCapabilityFilterKeys,
  isCommercialLimitFilterKey,
} from "@shared/commercial-capability";
import {
  commercialCatalogStore,
  newCommercialId,
  nowIso,
  type CommercialCatalogStore,
} from "./CatalogStore";
import { COMMERCIAL_PROJECTION_IDS } from "@shared/commercial-projection";
import { applyCommercialPresentationRules } from "@shared/commercial-catalog-presentation";
import {
  auditCommercialCreated,
  auditCommercialUpdated,
  auditMigrationPolicyChanged,
  auditPromotionCreated,
  auditRegionalPolicyChanged,
  type CommercialCatalogAuditActor,
} from "./commercialCatalogAudit";

export { CommercialCatalogError } from "./commercialCatalogError";
import { CommercialCatalogError } from "./commercialCatalogError";
import { persistLivePlan } from "./livePlanPersistence";

export class PlanService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list(): CommercialLivePlan[] {
    return [...this.store.plans.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  get(id: string): CommercialLivePlan | null {
    return this.store.plans.get(id) ?? null;
  }

  getByCode(code: string): CommercialLivePlan | null {
    return (
      [...this.store.plans.values()].find(
        (p) => p.code.toLowerCase() === code.toLowerCase()
      ) ?? null
    );
  }

  create(
    input: {
      code: string;
      name: string;
      description?: string | null;
      sortOrder?: number;
      isHidden?: boolean;
      featureBundleId?: string | null;
      limitProfileId?: string | null;
      trialPolicyId?: string | null;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialLivePlan {
    if ([...this.store.plans.values()].some((p) => p.code === input.code)) {
      throw new CommercialCatalogError(`Plan code ${input.code} already exists`, "duplicate_code");
    }
    const now = nowIso();
    const plan: CommercialLivePlan = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isHidden: input.isHidden ?? false,
      featureBundleId: input.featureBundleId ?? null,
      limitProfileId: input.limitProfileId ?? null,
      trialPolicyId: input.trialPolicyId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.plans.set(plan.id, plan);
    auditCommercialCreated(actor, "plan", plan.id, { ...plan });
    return plan;
  }

  /**
   * Atomic live-plan save. Validates, writes all fields, persists, then invalidates caches.
   * Rolls back in-memory state if validation or persistence fails.
   */
  async saveLive(
    id: string,
    patch: Partial<
      Pick<
        CommercialLivePlan,
        | "name"
        | "description"
        | "sortOrder"
        | "isHidden"
        | "featureBundleId"
        | "limitProfileId"
        | "trialPolicyId"
      >
    >,
    actor: CommercialCatalogAuditActor = {},
    options?: {
      requiresRegionalPricing?: boolean;
      skipPersist?: boolean;
      prices?: Array<{
        billingCycleId: string;
        currency: string;
        amount: string;
        regionId?: string | null;
      }>;
      capabilities?: Array<{ featureKey: string; included?: boolean }>;
      limits?: Array<{ limitKey: string; value: number | null }>;
    }
  ): Promise<CommercialLivePlan> {
    const existing = this.store.plans.get(id);
    if (!existing) throw new CommercialCatalogError(`Plan ${id} not found`, "not_found");
    const before = { ...existing };
    const previousPrices = Array.from(this.store.prices.entries()).filter(
      ([, p]) => p.planId === id
    );
    const previousBundles = Array.from(this.store.featureBundles.entries());
    const previousFeatures = Array.from(this.store.bundleFeatures.entries());
    const previousProfiles = Array.from(this.store.limitProfiles.entries());
    const previousLimitValues = Array.from(this.store.limitValues.entries());
    const restore = () => {
      this.store.plans.set(id, before);
      for (const [priceId, price] of [...this.store.prices.entries()]) {
        if (price.planId === id) this.store.prices.delete(priceId);
      }
      for (const [priceId, price] of previousPrices) {
        this.store.prices.set(priceId, price);
      }
      this.store.featureBundles.clear();
      for (const [bundleId, bundle] of previousBundles) {
        this.store.featureBundles.set(bundleId, bundle);
      }
      this.store.bundleFeatures.clear();
      for (const [featureId, feature] of previousFeatures) {
        this.store.bundleFeatures.set(featureId, feature);
      }
      this.store.limitProfiles.clear();
      for (const [profileId, profile] of previousProfiles) {
        this.store.limitProfiles.set(profileId, profile);
      }
      this.store.limitValues.clear();
      for (const [valueId, value] of previousLimitValues) {
        this.store.limitValues.set(valueId, value);
      }
    };
    let updated: CommercialLivePlan = {
      ...existing,
      ...patch,
      code: existing.code,
      id: existing.id,
      updatedAt: nowIso(),
    };
    this.store.plans.set(id, updated);

    try {
      if (options?.prices) {
        new PricingService(this.store).replacePlanPrices(id, options.prices, actor);
      }
      if (options?.capabilities) {
        const map: Record<string, boolean> = {};
        for (const row of options.capabilities) {
          map[row.featureKey] = row.included !== false;
        }
        const next = applyCommercialPresentationRules(map);
        const included = COMMERCIAL_PROJECTION_IDS.filter((key) => Boolean(next[key]));
        const bundles = new FeatureBundleService(this.store);
        let bundleId = updated.featureBundleId;
        if (!bundleId) {
          const created = bundles.create(
            {
              code: `${updated.code}-features`,
              name: `${updated.name} Features`,
              features: included.map((featureKey) => ({ featureKey, included: true })),
            },
            actor
          );
          bundleId = created.id;
          updated = { ...updated, featureBundleId: bundleId };
          this.store.plans.set(id, updated);
        } else {
          bundles.replaceIncludedFeatures(bundleId, included);
        }
      }
      if (options?.limits) {
        const checked = validateLivePlanLimitValues(options.limits);
        if (!checked.ok) {
          throw new CommercialCatalogError(
            `Live plan limit validation failed: ${checked.issues.map((i) => i.message).join("; ")}`,
            "publication_validation_failed"
          );
        }
        const limits = new LimitProfileService(this.store);
        let profileId = updated.limitProfileId;
        if (!profileId) {
          const created = limits.create(
            {
              code: `${updated.code}-limits`,
              name: `${updated.name} Limits`,
              values: checked.normalized.map((l) => ({
                limitKey: l.limitKey,
                value: l.value,
                unit: "count",
              })),
            },
            actor
          );
          profileId = created.id;
          updated = { ...updated, limitProfileId: profileId };
          this.store.plans.set(id, updated);
        } else {
          limits.replaceValues(profileId, checked.normalized);
        }
      }
    } catch (e) {
      restore();
      throw e;
    }

    const validator = new PlanSaveValidator(this.store);
    const validation = validator.validate(id, {
      requiresRegionalPricing: options?.requiresRegionalPricing,
    });
    if (!validation.ok) {
      restore();
      const msg = validation.issues.map((i) => i.message).join("; ");
      throw new CommercialCatalogError(
        `Live plan save validation failed: ${msg}`,
        "publication_validation_failed"
      );
    }

    if (!options?.skipPersist) {
      try {
        await persistLivePlan(id, this.store);
      } catch (e) {
        restore();
        throw e;
      }
    }

    auditCommercialUpdated(actor, "plan", id, before, { ...updated });

    const { invalidateCatalogReadyGate } = await import("./adoptionService");
    invalidateCatalogReadyGate();
    try {
      const { invalidatePublicCatalogCache } = await import(
        "../../commercial-catalog/publishing"
      );
      invalidatePublicCatalogCache();
    } catch {
      /* public cache optional in unit tests */
    }
    try {
      const { invalidateEntitlementCache } = await import(
        "../../subscription-runtime/cache"
      );
      invalidateEntitlementCache();
    } catch {
      /* runtime cache optional in unit tests */
    }

    return updated;
  }

  update(
    id: string,
    patch: Partial<
      Pick<
        CommercialLivePlan,
        | "name"
        | "description"
        | "sortOrder"
        | "isHidden"
        | "featureBundleId"
        | "limitProfileId"
        | "trialPolicyId"
      >
    >,
    actor: CommercialCatalogAuditActor = {}
  ): CommercialLivePlan {
    const existing = this.store.plans.get(id);
    if (!existing) throw new CommercialCatalogError(`Plan ${id} not found`, "not_found");
    const before = { ...existing };
    const updated: CommercialLivePlan = {
      ...existing,
      ...patch,
      code: existing.code,
      id: existing.id,
      updatedAt: nowIso(),
    };
    this.store.plans.set(id, updated);
    auditCommercialUpdated(actor, "plan", id, before, { ...updated });
    return updated;
  }
}

export class PricingService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list(planId?: string): CommercialPrice[] {
    const all = [...this.store.prices.values()];
    return planId ? all.filter((p) => p.planId === planId) : all;
  }

  create(
    input: {
      planId: string;
      billingCycleId: string;
      currency: string;
      amount: string;
      regionId?: string | null;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialPrice {
    const plan = this.store.plans.get(input.planId);
    if (!plan) throw new CommercialCatalogError("Plan not found", "not_found");
    if (!this.store.billingCycles.has(input.billingCycleId)) {
      throw new CommercialCatalogError("Billing cycle not found", "not_found");
    }
    if (input.regionId && !this.store.regions.has(input.regionId)) {
      throw new CommercialCatalogError("Region not found", "not_found");
    }
    const now = nowIso();
    const price: CommercialPrice = {
      id: newCommercialId(),
      planId: input.planId,
      billingCycleId: input.billingCycleId,
      currency: input.currency,
      amount: input.amount,
      regionId: input.regionId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.prices.set(price.id, price);
    auditCommercialCreated(actor, "price", price.id, { ...price });
    return price;
  }

  replacePlanPrices(
    planId: string,
    prices: Array<{
      billingCycleId: string;
      currency: string;
      amount: string;
      regionId?: string | null;
    }>,
    actor: CommercialCatalogAuditActor = {}
  ): CommercialPrice[] {
    if (!this.store.plans.has(planId)) {
      throw new CommercialCatalogError("Plan not found", "not_found");
    }
    for (const [id, p] of [...this.store.prices.entries()]) {
      if (p.planId === planId) this.store.prices.delete(id);
    }
    return prices.map((input) =>
      this.create({ planId, ...input }, actor)
    );
  }

  currentPriceForPlan(
    planId: string,
    billingCycleCode: string,
    regionId?: string | null
  ): CommercialPrice | null {
    const cycle = [...this.store.billingCycles.values()].find(
      (c) => c.code === billingCycleCode
    );
    if (!cycle) return null;
    const prices = this.list(planId).filter((p) => p.billingCycleId === cycle.id);
    if (regionId) {
      const regional = prices.find((p) => p.regionId === regionId);
      if (regional) return regional;
    }
    return prices.find((p) => p.regionId == null) ?? prices[0] ?? null;
  }

  listBillingCycles(): CommercialBillingCycle[] {
    return [...this.store.billingCycles.values()];
  }

  createBillingCycle(
    input: {
      code: string;
      name: string;
      intervalCount: number;
      intervalUnit: CommercialBillingCycle["intervalUnit"];
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialBillingCycle {
    if ([...this.store.billingCycles.values()].some((c) => c.code === input.code)) {
      throw new CommercialCatalogError(`Billing cycle ${input.code} exists`, "duplicate_code");
    }
    const now = nowIso();
    const cycle: CommercialBillingCycle = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      intervalCount: input.intervalCount,
      intervalUnit: input.intervalUnit,
      createdAt: now,
      updatedAt: now,
    };
    this.store.billingCycles.set(cycle.id, cycle);
    auditCommercialCreated(actor, "billing_cycle", cycle.id, { ...cycle });
    return cycle;
  }
}

export class FeatureBundleService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list() {
    return [...this.store.featureBundles.values()];
  }

  get(id: string) {
    return this.store.featureBundles.get(id) ?? null;
  }

  listFeatures(bundleId: string) {
    return [...this.store.bundleFeatures.values()].filter((f) => f.bundleId === bundleId);
  }

  create(
    input: {
      code: string;
      name: string;
      description?: string | null;
      features?: { featureKey: string; included?: boolean }[];
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialFeatureBundle {
    if ([...this.store.featureBundles.values()].some((b) => b.code === input.code)) {
      throw new CommercialCatalogError(`Bundle ${input.code} exists`, "duplicate_code");
    }
    const now = nowIso();
    const bundle: CommercialFeatureBundle = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.featureBundles.set(bundle.id, bundle);
    const featureInputs = input.features ?? [];
    const check = assertCommercialCapabilityFilterKeys(
      featureInputs.map((f) => f.featureKey)
    );
    if (!check.ok) {
      throw new CommercialCatalogError(
        `Unknown commercial capability filter key(s): ${check.invalid.join(", ")} — Plans are Capability Filters over Commercial Projection only`,
        "invalid_capability_filter"
      );
    }
    const includedByKey = new Map<string, boolean>();
    for (const f of featureInputs) {
      const mapped = assertCommercialCapabilityFilterKeys([f.featureKey]);
      if (mapped.ok) {
        for (const k of mapped.normalized) {
          includedByKey.set(k, f.included ?? true);
        }
      }
    }
    for (const featureKey of check.normalized) {
      const row = {
        id: newCommercialId(),
        bundleId: bundle.id,
        featureKey,
        included: includedByKey.get(featureKey) ?? true,
      };
      this.store.bundleFeatures.set(row.id, row);
    }
    auditCommercialCreated(actor, "feature_bundle", bundle.id, { ...bundle });
    return bundle;
  }

  /** Replace included Projection keys on a live-plan bundle. Atomic with saveLive. */
  replaceIncludedFeatures(bundleId: string, featureKeys: string[]): void {
    if (!this.store.featureBundles.get(bundleId)) {
      throw new CommercialCatalogError(`Bundle ${bundleId} not found`, "not_found");
    }
    const check = assertCommercialCapabilityFilterKeys(featureKeys);
    if (!check.ok) {
      throw new CommercialCatalogError(
        `Unknown commercial capability filter key(s): ${check.invalid.join(", ")} — Plans are Capability Filters over Commercial Projection only`,
        "invalid_capability_filter"
      );
    }
    for (const [rowId, row] of Array.from(this.store.bundleFeatures.entries())) {
      if (row.bundleId === bundleId) this.store.bundleFeatures.delete(rowId);
    }
    const unique = Array.from(new Set(check.normalized));
    for (const featureKey of unique) {
      const row = {
        id: newCommercialId(),
        bundleId,
        featureKey,
        included: true,
      };
      this.store.bundleFeatures.set(row.id, row);
    }
  }
}

export class LimitProfileService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list() {
    return [...this.store.limitProfiles.values()];
  }

  get(id: string) {
    return this.store.limitProfiles.get(id) ?? null;
  }

  listValues(profileId: string) {
    return [...this.store.limitValues.values()].filter((v) => v.profileId === profileId);
  }

  create(
    input: {
      code: string;
      name: string;
      description?: string | null;
      values?: { limitKey: string; value: number | null; unit?: string | null }[];
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialLimitProfile {
    if ([...this.store.limitProfiles.values()].some((p) => p.code === input.code)) {
      throw new CommercialCatalogError(`Limit profile ${input.code} exists`, "duplicate_code");
    }
    const now = nowIso();
    const profile: CommercialLimitProfile = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.limitProfiles.set(profile.id, profile);
    for (const v of input.values ?? []) {
      if (!isCommercialLimitFilterKey(v.limitKey)) {
        throw new CommercialCatalogError(
          `Unknown commercial limit filter key: ${v.limitKey}`,
          "invalid_capability_filter"
        );
      }
      const row = {
        id: newCommercialId(),
        profileId: profile.id,
        limitKey: v.limitKey,
        value: v.value,
        unit: v.unit ?? null,
      };
      this.store.limitValues.set(row.id, row);
    }
    auditCommercialCreated(actor, "limit_profile", profile.id, { ...profile });
    return profile;
  }

  replaceValues(
    profileId: string,
    values: { limitKey: string; value: number | null; unit?: string | null }[]
  ): void {
    if (!this.store.limitProfiles.get(profileId)) {
      throw new CommercialCatalogError(`Limit profile ${profileId} not found`, "not_found");
    }
    const staleIds: string[] = [];
    this.store.limitValues.forEach((row, id) => {
      if (row.profileId === profileId) staleIds.push(id);
    });
    for (const id of staleIds) this.store.limitValues.delete(id);
    for (const v of values) {
      if (!isCommercialLimitFilterKey(v.limitKey)) {
        throw new CommercialCatalogError(
          `Unknown commercial limit filter key: ${v.limitKey}`,
          "invalid_capability_filter"
        );
      }
      const row = {
        id: newCommercialId(),
        profileId,
        limitKey: v.limitKey,
        value: v.value,
        unit: v.unit ?? "count",
      };
      this.store.limitValues.set(row.id, row);
    }
  }
}

export class PromotionService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list() {
    return [...this.store.promotions.values()];
  }

  create(
    input: {
      code: string;
      name: string;
      effectSummary: string;
      eligiblePlanIds?: string[];
      startsAt?: string | null;
      endsAt?: string | null;
      isActive?: boolean;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialPromotion {
    if ([...this.store.promotions.values()].some((p) => p.code === input.code)) {
      throw new CommercialCatalogError(`Promotion ${input.code} exists`, "duplicate_code");
    }
    const now = nowIso();
    const promo: CommercialPromotion = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      effectSummary: input.effectSummary,
      eligiblePlanIds: input.eligiblePlanIds ?? [],
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.promotions.set(promo.id, promo);
    auditPromotionCreated(actor, promo.id, { ...promo });
    return promo;
  }
}

export class MigrationPolicyService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list() {
    return [...this.store.migrationPolicies.values()];
  }

  get(id: string) {
    return this.store.migrationPolicies.get(id) ?? null;
  }

  create(
    input: {
      code: string;
      name: string;
      description?: string | null;
      requiresExplicitAction?: boolean;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialMigrationPolicy {
    if ([...this.store.migrationPolicies.values()].some((p) => p.code === input.code)) {
      throw new CommercialCatalogError(`Migration policy ${input.code} exists`, "duplicate_code");
    }
    const now = nowIso();
    const policy: CommercialMigrationPolicy = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      requiresExplicitAction: input.requiresExplicitAction ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.migrationPolicies.set(policy.id, policy);
    auditMigrationPolicyChanged(actor, policy.id, null, { ...policy });
    return policy;
  }

  update(
    id: string,
    patch: Partial<Pick<CommercialMigrationPolicy, "name" | "description" | "requiresExplicitAction">>,
    actor: CommercialCatalogAuditActor = {}
  ): CommercialMigrationPolicy {
    const existing = this.store.migrationPolicies.get(id);
    if (!existing) throw new CommercialCatalogError("Migration policy not found", "not_found");
    const before = { ...existing };
    const updated = { ...existing, ...patch, updatedAt: nowIso() };
    this.store.migrationPolicies.set(id, updated);
    auditMigrationPolicyChanged(actor, id, before, { ...updated });
    return updated;
  }
}

export class RegionalPolicyService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list() {
    return [...this.store.regions.values()];
  }

  get(id: string) {
    return this.store.regions.get(id) ?? null;
  }

  create(
    input: {
      code: string;
      name: string;
      countryCode: string;
      currency: string;
      taxPolicyRef?: string | null;
      distributionPartner?: string | null;
      regulatoryNotes?: string | null;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialRegion {
    if ([...this.store.regions.values()].some((r) => r.code === input.code)) {
      throw new CommercialCatalogError(`Region ${input.code} exists`, "duplicate_code");
    }
    const now = nowIso();
    const region: CommercialRegion = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      countryCode: input.countryCode,
      currency: input.currency,
      taxPolicyRef: input.taxPolicyRef ?? null,
      distributionPartner: input.distributionPartner ?? null,
      regulatoryNotes: input.regulatoryNotes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.regions.set(region.id, region);
    auditRegionalPolicyChanged(actor, region.id, null, { ...region });
    return region;
  }

  update(
    id: string,
    patch: Partial<
      Pick<
        CommercialRegion,
        | "name"
        | "countryCode"
        | "currency"
        | "taxPolicyRef"
        | "distributionPartner"
        | "regulatoryNotes"
      >
    >,
    actor: CommercialCatalogAuditActor = {}
  ): CommercialRegion {
    const existing = this.store.regions.get(id);
    if (!existing) throw new CommercialCatalogError("Region not found", "not_found");
    const before = { ...existing };
    const updated = { ...existing, ...patch, updatedAt: nowIso() };
    this.store.regions.set(id, updated);
    auditRegionalPolicyChanged(actor, id, before, { ...updated });
    return updated;
  }
}

export class TrialPolicyCatalogService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list() {
    return [...this.store.trialPolicies.values()];
  }

  get(id: string) {
    return this.store.trialPolicies.get(id) ?? null;
  }

  create(
    input: {
      code: string;
      name: string;
      durationDays: number;
      description?: string | null;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialTrialPolicy {
    if ([...this.store.trialPolicies.values()].some((t) => t.code === input.code)) {
      throw new CommercialCatalogError(`Trial policy ${input.code} exists`, "duplicate_code");
    }
    const now = nowIso();
    const policy: CommercialTrialPolicy = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      durationDays: input.durationDays,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.trialPolicies.set(policy.id, policy);
    auditCommercialCreated(actor, "trial_policy", policy.id, { ...policy });
    return policy;
  }
}

export class PlanSaveValidator {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  validate(
    planId: string,
    options?: { requiresRegionalPricing?: boolean }
  ): PlanSaveValidationResult {
    const plan = this.store.plans.get(planId);
    if (!plan) {
      return {
        ok: false,
        issues: [{ code: "not_found", message: `Plan ${planId} not found` }],
      };
    }
    const prices = [...this.store.prices.values()].filter((p) => p.planId === planId);
    const result = validateLivePlanSave({
      plan,
      prices,
      billingCycles: [...this.store.billingCycles.values()],
      featureBundle: plan.featureBundleId
        ? this.store.featureBundles.get(plan.featureBundleId) ?? null
        : null,
      limitProfile: plan.limitProfileId
        ? this.store.limitProfiles.get(plan.limitProfileId) ?? null
        : null,
      requiresRegionalPricing: options?.requiresRegionalPricing,
    });
    if (!result.ok) {
      this.store.recordValidationError(
        result.issues.map((i) => i.message).join("; ")
      );
    }
    return result;
  }
}

export function getCommercialCatalogHealth(
  store: CommercialCatalogStore = commercialCatalogStore
): CommercialCatalogHealth {
  const plans = [...store.plans.values()];
  let status: CommercialCatalogHealth["status"] = "healthy";
  if (store.validationErrorCount > 0) status = "warning";
  if (store.validationErrorCount > 10) status = "degraded";

  return {
    program: COMMERCIAL_LIVE_PLANS_PROGRAM,
    status,
    plans: plans.length,
    hiddenPlans: plans.filter((p) => p.isHidden).length,
    prices: store.prices.size,
    regions: store.regions.size,
    promotions: store.promotions.size,
    validationErrors: store.validationErrorCount,
    lastValidationError: store.lastValidationError,
  };
}

export const planService = new PlanService();
export const pricingService = new PricingService();
export const featureBundleService = new FeatureBundleService();
export const limitProfileService = new LimitProfileService();
export const promotionService = new PromotionService();
export const migrationPolicyService = new MigrationPolicyService();
export const regionalPolicyService = new RegionalPolicyService();
export const trialPolicyCatalogService = new TrialPolicyCatalogService();
export const planSaveValidator = new PlanSaveValidator();

export {
  CommercialCatalogStore,
  commercialCatalogStore,
  newCommercialId,
  nowIso,
} from "./CatalogStore";

export {
  listLivePlanOfferings,
  listPublishedPlanOfferings,
  listPlansForSelectionLegacyShape,
  resolveTrialPolicyFromCatalog,
  resolveRegionFromCatalog,
  resolvePromotionFromCatalog,
  bindSubscriptionToLivePlan,
  ensureLivePlanBoundForSubscription,
  classifyPlanTransitionEvent,
  getSubscriptionCommercialBinding,
  resolveLivePlanCapabilities,
  getAdoptionObservability,
  ensureCatalogReady,
  invalidateCatalogReadyGate,
  resolveLegacyPlanIdFromPlan,
  resolvePlanIdFromLegacyPlanId,
  resolveCanonicalLivePlanId,
  resolveLivePlanById,
  resolveLivePlanCapabilitiesByPlanId,
  resolveLivePlanDisplayByPlanRef,
  resolveCheckoutOfferFromLivePlan,
  resolveLivePlanDisplayByLegacyId,
  resolveSubscriptionPlanView,
  isKnownLegacyPlanId,
  isLivePlanUuid,
  livePlanUuidInput,
  parseWebhookPlanRef,
  parseLegacyPlanInteger,
  type LivePlanCheckoutOffer,
  type LivePlanDisplay,
} from "./adoptionService";

export { ensureCommercialCatalogAdoptionSeed } from "./seedAdoptionCatalog";
export {
  COMMERCIAL_PERSISTENT_CATALOG_BOOTSTRAP_PROGRAM,
  COMMERCIAL_BOOTSTRAP_LIFECYCLE_GOVERNANCE_PROGRAM,
  BOOTSTRAP_01_INFRASTRUCTURE_INITIALIZATION_BOUNDARY,
  bootstrapPersistentCommercialCatalog,
  projectionFeatureKeysForBridgePlan,
  isPersistentCatalogUninitialized,
} from "./persistentCatalogBootstrap";
export { hydrateCommercialCatalogFromDb } from "./drizzleCatalogPersistence";
export {
  COMMERCIAL_LIVE_PLAN_PERSISTENCE_PROGRAM,
  InMemoryDurableCatalogBackend,
  persistLivePlan,
  persistFullLiveCatalog,
  hydrateRuntimeCatalogFromDurableAuthority,
  setDurableLivePlanBackendForTests,
  getDurableLivePlanBackend,
} from "./livePlanPersistence";
export { commercialAdoptionObservability } from "./adoptionObservability";
export { commercialRuntimeAuthorityObservability } from "./runtimeAuthorityObservability";
export { LEGACY_PLAN_BRIDGE, bridgeByLegacyPlanId, bridgeByCatalogPlanCode } from "./legacyPlanBridge";
