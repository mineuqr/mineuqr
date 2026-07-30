/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1 — domain services.
 */

import {
  canTransitionPlanVersion,
  isPlanVersionImmutable,
  validatePublication,
  buildCommercialSnapshotDefinition,
  freezeCommercialSnapshot,
  type CommercialBillingCycle,
  type CommercialCatalogHealth,
  type CommercialFeatureBundle,
  type CommercialLimitProfile,
  type CommercialMigrationPolicy,
  type CommercialPlanIdentity,
  type CommercialPlanVersion,
  type CommercialPrice,
  type CommercialPromotion,
  type CommercialRegion,
  type CommercialRetirementPolicy,
  type CommercialSnapshotDefinition,
  type CommercialTrialPolicy,
  type PlanVersionLifecycleState,
  type PublicationValidationResult,
  type VersionCompatibility,
  COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
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
import {
  auditCommercialCreated,
  auditCommercialDeprecated,
  auditCommercialPublished,
  auditCommercialRetired,
  auditCommercialUpdated,
  auditMigrationPolicyChanged,
  auditPromotionCreated,
  auditRegionalPolicyChanged,
  type CommercialCatalogAuditActor,
} from "./commercialCatalogAudit";

export class CommercialCatalogError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "CommercialCatalogError";
  }
}

function requireDraftMutable(version: CommercialPlanVersion) {
  if (isPlanVersionImmutable(version.state)) {
    throw new CommercialCatalogError(
      `Plan Version ${version.id} is ${version.state} and immutable (CC-02)`,
      "immutable_version"
    );
  }
}

export class PlanService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list(): CommercialPlanIdentity[] {
    return [...this.store.plans.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  get(id: string): CommercialPlanIdentity | null {
    return this.store.plans.get(id) ?? null;
  }

  create(
    input: {
      code: string;
      name: string;
      description?: string | null;
      sortOrder?: number;
      isHidden?: boolean;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialPlanIdentity {
    if ([...this.store.plans.values()].some((p) => p.code === input.code)) {
      throw new CommercialCatalogError(`Plan code ${input.code} already exists`, "duplicate_code");
    }
    const now = nowIso();
    const plan: CommercialPlanIdentity = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isHidden: input.isHidden ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.store.plans.set(plan.id, plan);
    auditCommercialCreated(actor, "plan", plan.id, { ...plan });
    return plan;
  }

  update(
    id: string,
    patch: Partial<Pick<CommercialPlanIdentity, "name" | "description" | "sortOrder" | "isHidden">>,
    actor: CommercialCatalogAuditActor = {}
  ): CommercialPlanIdentity {
    const existing = this.store.plans.get(id);
    if (!existing) throw new CommercialCatalogError(`Plan ${id} not found`, "not_found");
    const before = { ...existing };
    const updated: CommercialPlanIdentity = {
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

export class PlanVersionService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list(planId?: string): CommercialPlanVersion[] {
    const all = [...this.store.versions.values()];
    return (planId ? all.filter((v) => v.planId === planId) : all).sort((a, b) =>
      a.versionCode.localeCompare(b.versionCode)
    );
  }

  get(id: string): CommercialPlanVersion | null {
    return this.store.versions.get(id) ?? null;
  }

  create(
    input: {
      planId: string;
      versionCode: string;
      versionName: string;
      featureBundleId?: string | null;
      limitProfileId?: string | null;
      trialPolicyId?: string | null;
      migrationPolicyId?: string | null;
      retirementPolicyId?: string | null;
      compatibility?: VersionCompatibility;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialPlanVersion {
    if (!this.store.plans.has(input.planId)) {
      throw new CommercialCatalogError(`Plan ${input.planId} not found`, "not_found");
    }
    const dup = [...this.store.versions.values()].some(
      (v) => v.planId === input.planId && v.versionCode === input.versionCode
    );
    if (dup) {
      throw new CommercialCatalogError(
        `Version code ${input.versionCode} already exists for plan`,
        "duplicate_code"
      );
    }
    const now = nowIso();
    const version: CommercialPlanVersion = {
      id: newCommercialId(),
      planId: input.planId,
      versionCode: input.versionCode,
      versionName: input.versionName,
      state: "draft",
      featureBundleId: input.featureBundleId ?? null,
      limitProfileId: input.limitProfileId ?? null,
      trialPolicyId: input.trialPolicyId ?? null,
      migrationPolicyId: input.migrationPolicyId ?? null,
      retirementPolicyId: input.retirementPolicyId ?? null,
      compatibility: input.compatibility ?? {
        upgradeTargets: [],
        downgradeTargets: [],
        migrationRequirements: [],
        breakingCommercialChanges: [],
      },
      publishedAt: null,
      deprecatedAt: null,
      retiredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.versions.set(version.id, version);
    auditCommercialCreated(actor, "plan_version", version.id, { ...version });
    return version;
  }

  updateDraft(
    id: string,
    patch: Partial<
      Pick<
        CommercialPlanVersion,
        | "versionName"
        | "featureBundleId"
        | "limitProfileId"
        | "trialPolicyId"
        | "migrationPolicyId"
        | "retirementPolicyId"
        | "compatibility"
      >
    >,
    actor: CommercialCatalogAuditActor = {}
  ): CommercialPlanVersion {
    const existing = this.store.versions.get(id);
    if (!existing) throw new CommercialCatalogError(`Version ${id} not found`, "not_found");
    requireDraftMutable(existing);
    const before = { ...existing };
    const updated: CommercialPlanVersion = {
      ...existing,
      ...patch,
      id: existing.id,
      planId: existing.planId,
      versionCode: existing.versionCode,
      state: "draft",
      updatedAt: nowIso(),
    };
    this.store.versions.set(id, updated);
    auditCommercialUpdated(actor, "plan_version", id, before, { ...updated });
    return updated;
  }
}

export class PricingService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list(planVersionId?: string): CommercialPrice[] {
    const all = [...this.store.prices.values()];
    return planVersionId ? all.filter((p) => p.planVersionId === planVersionId) : all;
  }

  create(
    input: {
      planVersionId: string;
      billingCycleId: string;
      currency: string;
      amount: string;
      regionId?: string | null;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialPrice {
    const version = this.store.versions.get(input.planVersionId);
    if (!version) throw new CommercialCatalogError("Plan Version not found", "not_found");
    requireDraftMutable(version);
    if (!this.store.billingCycles.has(input.billingCycleId)) {
      throw new CommercialCatalogError("Billing cycle not found", "not_found");
    }
    if (input.regionId && !this.store.regions.has(input.regionId)) {
      throw new CommercialCatalogError("Region not found", "not_found");
    }
    const now = nowIso();
    const price: CommercialPrice = {
      id: newCommercialId(),
      planVersionId: input.planVersionId,
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
      eligiblePlanVersionIds?: string[];
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
      eligiblePlanVersionIds: input.eligiblePlanVersionIds ?? [],
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

  createRetirementPolicy(
    input: {
      code: string;
      name: string;
      description?: string | null;
      allowRenewals?: boolean;
    },
    actor: CommercialCatalogAuditActor = {}
  ): CommercialRetirementPolicy {
    if ([...this.store.retirementPolicies.values()].some((p) => p.code === input.code)) {
      throw new CommercialCatalogError(`Retirement policy ${input.code} exists`, "duplicate_code");
    }
    const now = nowIso();
    const policy: CommercialRetirementPolicy = {
      id: newCommercialId(),
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      allowRenewals: input.allowRenewals ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.store.retirementPolicies.set(policy.id, policy);
    auditCommercialCreated(actor, "retirement_policy", policy.id, { ...policy });
    return policy;
  }

  listRetirementPolicies() {
    return [...this.store.retirementPolicies.values()];
  }

  getRetirementPolicy(id: string) {
    return this.store.retirementPolicies.get(id) ?? null;
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

/** Reusable CC-16 publication validator service. */
export class PublicationValidator {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  validate(
    versionId: string,
    options?: { requiresRegionalPricing?: boolean }
  ): PublicationValidationResult {
    const version = this.store.versions.get(versionId);
    if (!version) {
      return {
        ok: false,
        issues: [{ code: "not_found", message: `Version ${versionId} not found` }],
      };
    }
    const prices = [...this.store.prices.values()].filter(
      (p) => p.planVersionId === versionId
    );
    const result = validatePublication({
      version,
      prices,
      billingCycles: [...this.store.billingCycles.values()],
      featureBundle: version.featureBundleId
        ? this.store.featureBundles.get(version.featureBundleId) ?? null
        : null,
      limitProfile: version.limitProfileId
        ? this.store.limitProfiles.get(version.limitProfileId) ?? null
        : null,
      migrationPolicy: version.migrationPolicyId
        ? this.store.migrationPolicies.get(version.migrationPolicyId) ?? null
        : null,
      retirementPolicy: version.retirementPolicyId
        ? this.store.retirementPolicies.get(version.retirementPolicyId) ?? null
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

export class PublicationService {
  private readonly validator: PublicationValidator;

  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {
    this.validator = new PublicationValidator(store);
  }

  validate(versionId: string, options?: { requiresRegionalPricing?: boolean }) {
    return this.validator.validate(versionId, options);
  }

  publish(
    versionId: string,
    actor: CommercialCatalogAuditActor = {},
    options?: { requiresRegionalPricing?: boolean }
  ): CommercialPlanVersion {
    const version = this.store.versions.get(versionId);
    if (!version) throw new CommercialCatalogError("Version not found", "not_found");
    const validation = this.validator.validate(versionId, options);
    if (!validation.ok) {
      const msg = validation.issues.map((i) => i.message).join("; ");
      this.store.recordPublicationError(msg);
      throw new CommercialCatalogError(
        `Publication validation failed (CC-16): ${msg}`,
        "publication_validation_failed"
      );
    }
    if (!canTransitionPlanVersion(version.state, "published")) {
      throw new CommercialCatalogError(
        `Cannot transition ${version.state} → published`,
        "invalid_transition"
      );
    }
    const before = { ...version };
    const now = nowIso();
    const updated: CommercialPlanVersion = {
      ...version,
      state: "published",
      publishedAt: now,
      updatedAt: now,
    };
    this.store.versions.set(versionId, updated);
    auditCommercialPublished(actor, versionId, before, { ...updated });
    return updated;
  }

  deprecate(versionId: string, actor: CommercialCatalogAuditActor = {}): CommercialPlanVersion {
    return this.transition(versionId, "deprecated", actor, (v, now) => ({
      ...v,
      state: "deprecated",
      deprecatedAt: now,
      updatedAt: now,
    }));
  }

  retire(versionId: string, actor: CommercialCatalogAuditActor = {}): CommercialPlanVersion {
    return this.transition(versionId, "retired", actor, (v, now) => ({
      ...v,
      state: "retired",
      retiredAt: now,
      updatedAt: now,
    }));
  }

  private transition(
    versionId: string,
    to: PlanVersionLifecycleState,
    actor: CommercialCatalogAuditActor,
    apply: (v: CommercialPlanVersion, now: string) => CommercialPlanVersion
  ): CommercialPlanVersion {
    const version = this.store.versions.get(versionId);
    if (!version) throw new CommercialCatalogError("Version not found", "not_found");
    if (!canTransitionPlanVersion(version.state, to)) {
      throw new CommercialCatalogError(
        `Cannot transition ${version.state} → ${to}`,
        "invalid_transition"
      );
    }
    const before = { ...version };
    const updated = apply(version, nowIso());
    this.store.versions.set(versionId, updated);
    if (to === "deprecated") {
      auditCommercialDeprecated(actor, versionId, before, { ...updated });
    } else if (to === "retired") {
      auditCommercialRetired(actor, versionId, before, { ...updated });
    }
    return updated;
  }
}

/**
 * Builds immutable Commercial Snapshot definitions from Catalog (CC-13).
 * Subscription Platform persists snapshots on activation; Catalog owns the contract.
 */
export class CommercialSnapshotService {
  constructor(private readonly store: CommercialCatalogStore = commercialCatalogStore) {}

  list(planVersionId?: string) {
    const all = [...this.store.snapshots.values()];
    return planVersionId ? all.filter((s) => s.planVersionId === planVersionId) : all;
  }

  get(id: string) {
    return this.store.snapshots.get(id) ?? null;
  }

  /**
   * Materialize a snapshot definition from a Published (or later) Plan Version.
   * Does not bind to a Subscription — definition only.
   */
  captureFromVersion(
    planVersionId: string,
    input?: {
      effectiveDate?: string;
      promotionId?: string | null;
      regionId?: string | null;
    }
  ): { id: string; payload: Readonly<CommercialSnapshotDefinition> } {
    const version = this.store.versions.get(planVersionId);
    if (!version) throw new CommercialCatalogError("Version not found", "not_found");
    if (version.state === "draft") {
      throw new CommercialCatalogError(
        "Cannot snapshot a draft version",
        "invalid_state"
      );
    }
    const plan = this.store.plans.get(version.planId);
    if (!plan) throw new CommercialCatalogError("Plan not found", "not_found");

    const prices = [...this.store.prices.values()].filter(
      (p) => p.planVersionId === planVersionId
    );
    if (!prices.length) {
      throw new CommercialCatalogError("No pricing for version", "incomplete");
    }
    const price =
      (input?.regionId
        ? prices.find((p) => p.regionId === input.regionId)
        : null) ?? prices[0]!;
    const cycle = this.store.billingCycles.get(price.billingCycleId);
    if (!cycle) throw new CommercialCatalogError("Billing cycle missing", "incomplete");

    const features = version.featureBundleId
      ? [...this.store.bundleFeatures.values()].filter(
          (f) => f.bundleId === version.featureBundleId
        )
      : [];
    const limits = version.limitProfileId
      ? [...this.store.limitValues.values()].filter(
          (l) => l.profileId === version.limitProfileId
        )
      : [];
    const trial = version.trialPolicyId
      ? this.store.trialPolicies.get(version.trialPolicyId) ?? null
      : null;
    const promo = input?.promotionId
      ? this.store.promotions.get(input.promotionId) ?? null
      : null;
    const region = input?.regionId
      ? this.store.regions.get(input.regionId) ?? null
      : price.regionId
        ? this.store.regions.get(price.regionId) ?? null
        : null;

    const effectiveDate = input?.effectiveDate ?? nowIso();
    const payload = freezeCommercialSnapshot(
      buildCommercialSnapshotDefinition({
        planIdentityId: plan.id,
        planVersionId: version.id,
        catalogPlanCode: plan.code,
        commercialName: plan.name,
        versionName: version.versionName,
        currency: price.currency,
        billingCycle: {
          id: cycle.id,
          code: cycle.code,
          intervalCount: cycle.intervalCount,
          intervalUnit: cycle.intervalUnit,
        },
        pricing: {
          amount: price.amount,
          currency: price.currency,
          billingCycleId: cycle.id,
          billingCycleCode: cycle.code,
        },
        includedFeatures: features.map((f) => ({
          featureKey: f.featureKey,
          included: f.included,
        })),
        usageLimits: limits.map((l) => ({
          limitKey: l.limitKey,
          value: l.value,
          unit: l.unit,
        })),
        trialPolicy: trial
          ? {
              trialPolicyId: trial.id,
              durationDays: trial.durationDays,
              name: trial.name,
            }
          : null,
        promotionApplied: promo
          ? {
              promotionId: promo.id,
              code: promo.code,
              effectSummary: promo.effectSummary,
            }
          : null,
        effectiveDate,
        region: region
          ? {
              regionId: region.id,
              countryCode: region.countryCode,
              currency: region.currency,
              taxPolicyRef: region.taxPolicyRef,
              distributionPartner: region.distributionPartner,
            }
          : null,
      })
    );

    const id = newCommercialId();
    this.store.snapshots.set(id, {
      id,
      planVersionId,
      schemaVersion: 1,
      payload: payload as CommercialSnapshotDefinition,
      effectiveDate,
      createdAt: nowIso(),
    });
    return { id, payload };
  }
}

export function getCommercialCatalogHealth(
  store: CommercialCatalogStore = commercialCatalogStore
): CommercialCatalogHealth {
  const versions = [...store.versions.values()];
  const byState = {
    draft: versions.filter((v) => v.state === "draft").length,
    published: versions.filter((v) => v.state === "published").length,
    deprecated: versions.filter((v) => v.state === "deprecated").length,
    retired: versions.filter((v) => v.state === "retired").length,
    total: versions.length,
  };
  let status: CommercialCatalogHealth["status"] = "healthy";
  if (store.publicationErrorCount > 0 || store.validationErrorCount > 0) {
    status = "warning";
  }
  if (store.publicationErrorCount > 10) status = "degraded";

  return {
    program: COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
    status,
    plans: store.plans.size,
    versions: byState,
    prices: store.prices.size,
    regions: store.regions.size,
    promotions: store.promotions.size,
    publicationErrors: store.publicationErrorCount,
    validationErrors: store.validationErrorCount,
    lastPublicationError: store.lastPublicationError,
    lastValidationError: store.lastValidationError,
  };
}

export const planService = new PlanService();
export const planVersionService = new PlanVersionService();
export const pricingService = new PricingService();
export const featureBundleService = new FeatureBundleService();
export const limitProfileService = new LimitProfileService();
export const promotionService = new PromotionService();
export const migrationPolicyService = new MigrationPolicyService();
export const regionalPolicyService = new RegionalPolicyService();
export const trialPolicyCatalogService = new TrialPolicyCatalogService();
export const publicationService = new PublicationService();
export const commercialSnapshotService = new CommercialSnapshotService();
export const publicationValidator = new PublicationValidator();

export {
  CommercialCatalogStore,
  commercialCatalogStore,
  newCommercialId,
  nowIso,
} from "./CatalogStore";

export {
  listPublishedPlanOfferings,
  listPlansForSelectionLegacyShape,
  resolveTrialPolicyFromCatalog,
  resolveRegionFromCatalog,
  resolvePromotionFromCatalog,
  createImmutableCommercialSnapshotForSubscription,
  ensureCommercialSnapshotBoundForSubscription,
  classifyPlanTransitionEvent,
  getSubscriptionCommercialBinding,
  resolveCommercialFactsFromSnapshot,
  getAdoptionObservability,
  ensureCatalogReady,
  resolveLegacyPlanIdFromVersion,
  resolvePlanVersionIdFromLegacyPlanId,
} from "./adoptionService";

export { ensureCommercialCatalogAdoptionSeed } from "./seedAdoptionCatalog";
export {
  hydrateCommercialCatalogFromDb,
  hydrateCommercialSnapshotById,
} from "./drizzleCatalogPersistence";
export { commercialAdoptionObservability } from "./adoptionObservability";
export { commercialRuntimeAuthorityObservability } from "./runtimeAuthorityObservability";
export { LEGACY_PLAN_BRIDGE, bridgeByLegacyPlanId } from "./legacyPlanBridge";
