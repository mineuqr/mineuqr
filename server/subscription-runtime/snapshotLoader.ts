/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Loads the immutable bound Commercial Snapshot only (I-CPL Snapshot Invariant).
 * NEVER reads mutable Catalog definitions for entitlement facts.
 */

import type { CommercialSnapshotDefinition } from "@shared/commercial-catalog";
import {
  getSubscriptionCommercialBinding,
  resolveCommercialFactsFromSnapshot,
} from "../services/commercial-catalog";

export type LoadedSnapshot = {
  subscriptionId: number;
  snapshotId: string;
  planVersionId: string;
  legacyPlanId: number | null;
  snapshot: CommercialSnapshotDefinition;
};

export type SnapshotLoadResult =
  | { ok: true; binding: true; data: LoadedSnapshot }
  | { ok: false; binding: false; reason: "no_binding" }
  | { ok: false; binding: true; reason: "snapshot_unreadable"; snapshotId: string; planVersionId: string; legacyPlanId: number | null };

/**
 * Load the single active bound Snapshot for a subscription (I-CPL-13).
 */
export async function loadBoundCommercialSnapshot(
  subscriptionId: number
): Promise<SnapshotLoadResult> {
  const binding = await getSubscriptionCommercialBinding(subscriptionId);
  if (!binding) {
    return { ok: false, binding: false, reason: "no_binding" };
  }

  const facts = await resolveCommercialFactsFromSnapshot(subscriptionId);
  if (facts.source !== "snapshot" || !facts.snapshot) {
    return {
      ok: false,
      binding: true,
      reason: "snapshot_unreadable",
      snapshotId: binding.snapshotId,
      planVersionId: binding.planVersionId,
      legacyPlanId: binding.legacyPlanId,
    };
  }

  return {
    ok: true,
    binding: true,
    data: {
      subscriptionId,
      snapshotId: binding.snapshotId,
      planVersionId: binding.planVersionId,
      legacyPlanId: binding.legacyPlanId,
      snapshot: facts.snapshot,
    },
  };
}
