import { createHash } from "crypto";
import type { CommercialExportPackage } from "./reportContracts";

/** Deterministic fingerprint for regression parity across dashboard and exports. */
export function computeSnapshotFingerprint(
  overview: CommercialExportPackage["overviewReport"],
  subscriberSummary: CommercialExportPackage["subscriberReport"]["summary"]
): string {
  const payload = {
    asOfMetrics: {
      mrr: overview.executive.mrr,
      arr: overview.executive.arr,
      commercialSubscribers: overview.executive.commercialSubscribers,
      activeSubscriptions: overview.executive.activeSubscriptions,
      activeTrials: overview.executive.activeTrials,
      activeRestaurants: overview.executive.activeRestaurants,
      totalUsers: overview.executive.totalUsers,
      health: overview.subscriptionHealth,
      attention: {
        expiringWithin30Days: overview.needsAttention.expiringWithin30Days,
        canceledAccounts: overview.needsAttention.canceledAccounts,
        expiredAccounts: overview.needsAttention.expiredAccounts,
      },
      planDistribution: overview.planDistribution.entries,
    },
    subscriberSummary,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
