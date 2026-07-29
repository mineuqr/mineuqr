/**
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1
 * Branch-only commercial entitlement resolution.
 *
 * IF SubscriptionBinding exists → Snapshot ONLY (no Legacy, no Catalog, no merge)
 * ELSE → Legacy Bridge ONLY
 */

import { getCommercialEntitlementsFromContext } from "@commercial/getCommercialEntitlements";
import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";
import { buildCommercialContextFromDb } from "./buildCommercialContextFromDb";
import { getSubscriptionsByUser, getUserById } from "../db";
import { pickUserLevelSubscription } from "../subscriptionResolver";
import {
  getSubscriptionCommercialBinding,
  resolveCommercialFactsFromSnapshot,
} from "../services/commercial-catalog";
import { commercialRuntimeAuthorityObservability } from "../services/commercial-catalog/runtimeAuthorityObservability";
import { buildEntitlementsFromCommercialSnapshot } from "./snapshotRuntimeAuthority";

export async function getCommercialEntitlements(
  ownerId: number,
  now: Date = new Date()
): Promise<CommercialEntitlementsResult> {
  const rows = await getSubscriptionsByUser(ownerId);
  const canonical = pickUserLevelSubscription(rows, now);

  if (!canonical?.id) {
    commercialRuntimeAuthorityObservability.recordLegacyBridgeUsed(
      "getCommercialEntitlements:no_subscription"
    );
    commercialRuntimeAuthorityObservability.recordBindingCoverage(false);
    const context = await buildCommercialContextFromDb(ownerId, now);
    return getCommercialEntitlementsFromContext(context);
  }

  const binding = await getSubscriptionCommercialBinding(canonical.id);
  commercialRuntimeAuthorityObservability.recordBindingCoverage(!!binding);

  if (binding) {
    const facts = await resolveCommercialFactsFromSnapshot(canonical.id);
    if (facts.source !== "snapshot" || !facts.snapshot) {
      // Fail closed — binding exists; never fall back to Legacy Bridge.
      commercialRuntimeAuthorityObservability.recordSnapshotCreationFailure(
        `bound_snapshot_unreadable:${binding.snapshotId}`
      );
      const user = await getUserById(ownerId);
      const denied = buildEntitlementsFromCommercialSnapshot(
        {
          snapshotSchemaVersion: 1,
          planIdentityId: binding.planVersionId,
          planVersionId: binding.planVersionId,
          commercialName: "unavailable",
          versionName: "unavailable",
          currency: "SAR",
          billingCycle: {
            id: "unavailable",
            code: "monthly",
            intervalCount: 1,
            intervalUnit: "month",
          },
          pricing: {
            amount: "0",
            currency: "SAR",
            billingCycleId: "unavailable",
            billingCycleCode: "monthly",
          },
          includedFeatures: [],
          usageLimits: [],
          trialPolicy: null,
          promotionApplied: null,
          effectiveDate: new Date(0).toISOString(),
          region: null,
        },
        {
          ownerId,
          role: user?.role ?? "user",
          status: "expired",
          trialEndsAt: null,
          currentPeriodEnd: null,
          legacyPlanId: binding.legacyPlanId,
          now,
        }
      );
      return {
        ...denied,
        meta: {
          ...(denied as { meta?: Record<string, unknown> }).meta,
          commercialResolutionSource: "snapshot_fail_closed",
          commercialSnapshotId: binding.snapshotId,
        },
      } as CommercialEntitlementsResult;
    }

    const user = await getUserById(ownerId);
    const result = buildEntitlementsFromCommercialSnapshot(facts.snapshot, {
      ownerId,
      role: user?.role ?? "user",
      status: canonical.status,
      trialEndsAt: canonical.trialEndsAt ?? null,
      currentPeriodEnd: canonical.currentPeriodEnd ?? null,
      legacyPlanId: binding.legacyPlanId ?? canonical.planId,
      now,
    });

    commercialRuntimeAuthorityObservability.recordSnapshotResolved(canonical.id);

    return {
      ...result,
      meta: {
        ...(result as { meta?: Record<string, unknown> }).meta,
        commercialSnapshotId: binding.snapshotId,
        commercialResolutionSource: "snapshot",
      },
    } as CommercialEntitlementsResult;
  }

  // Unbound — Legacy Bridge ONLY
  commercialRuntimeAuthorityObservability.recordLegacyBridgeUsed(
    "getCommercialEntitlements"
  );

  const context = await buildCommercialContextFromDb(ownerId, now);
  const legacy = getCommercialEntitlementsFromContext(context);
  return {
    ...legacy,
    meta: {
      commercialResolutionSource: "legacy_bridge",
    },
  } as CommercialEntitlementsResult;
}

export type { CommercialEntitlementsResult };
