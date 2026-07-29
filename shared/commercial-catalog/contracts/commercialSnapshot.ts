/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
 * Commercial Snapshot build contract (CC-13).
 */

import type {
  CommercialSnapshotBuildInput,
  CommercialSnapshotDefinition,
} from "../types/snapshot";

export function buildCommercialSnapshotDefinition(
  input: CommercialSnapshotBuildInput
): CommercialSnapshotDefinition {
  return {
    snapshotSchemaVersion: 1,
    planIdentityId: input.planIdentityId,
    planVersionId: input.planVersionId,
    commercialName: input.commercialName,
    versionName: input.versionName,
    currency: input.currency,
    billingCycle: input.billingCycle,
    pricing: input.pricing,
    includedFeatures: [...input.includedFeatures],
    usageLimits: [...input.usageLimits],
    trialPolicy: input.trialPolicy ?? null,
    promotionApplied: input.promotionApplied ?? null,
    effectiveDate: input.effectiveDate,
    region: input.region ?? null,
  };
}

/** Snapshots are immutable after activation — deep-freeze for runtime safety. */
export function freezeCommercialSnapshot(
  snapshot: CommercialSnapshotDefinition
): Readonly<CommercialSnapshotDefinition> {
  return Object.freeze({
    ...snapshot,
    billingCycle: Object.freeze({ ...snapshot.billingCycle }),
    pricing: Object.freeze({ ...snapshot.pricing }),
    includedFeatures: Object.freeze(
      snapshot.includedFeatures.map((f) => Object.freeze({ ...f }))
    ),
    usageLimits: Object.freeze(
      snapshot.usageLimits.map((l) => Object.freeze({ ...l }))
    ),
    trialPolicy: snapshot.trialPolicy
      ? Object.freeze({ ...snapshot.trialPolicy })
      : null,
    promotionApplied: snapshot.promotionApplied
      ? Object.freeze({ ...snapshot.promotionApplied })
      : null,
    region: snapshot.region ? Object.freeze({ ...snapshot.region }) : null,
  });
}
