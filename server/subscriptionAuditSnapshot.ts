/**
 * ADMIN-SECURITY-CENTER — normalized subscription snapshot for audit events.
 * Shared by PR-3 (create/update) and PR-4 (delete enhancement).
 */
export type SubscriptionAuditStatus = "active" | "canceled" | "expired" | "trial";
export type SubscriptionAuditBillingCycle = "monthly" | "yearly";

/** Audit-facing subscription fields (plan, status, period). */
export type SubscriptionAuditSnapshot = {
  plan: string | number;
  status: SubscriptionAuditStatus;
  startDate: string;
  expiration: string;
};

/** Subscription Snapshot Format v1 — change/delete metadata subset (plan, status, expiration). */
export type SubscriptionAuditChangeFields = {
  plan: string | number;
  status: SubscriptionAuditStatus;
  expiration: string;
};

export function subscriptionAuditSnapshotToChangeFields(
  snapshot: SubscriptionAuditSnapshot
): SubscriptionAuditChangeFields {
  return {
    plan: snapshot.plan,
    status: snapshot.status,
    expiration: snapshot.expiration,
  };
}

export type SubscriptionAuditSnapshotSource = {
  planId: string | number;
  status: SubscriptionAuditStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
};

export function subscriptionAuditSnapshotFromRow(
  row: SubscriptionAuditSnapshotSource
): SubscriptionAuditSnapshot {
  return {
    plan: row.planId,
    status: row.status,
    startDate: row.currentPeriodStart,
    expiration: row.currentPeriodEnd,
  };
}

export function subscriptionAuditSnapshotFromInsert(
  row: SubscriptionAuditSnapshotSource
): SubscriptionAuditSnapshot {
  return subscriptionAuditSnapshotFromRow(row);
}

export function subscriptionAuditSnapshotsEqual(
  a: SubscriptionAuditSnapshot,
  b: SubscriptionAuditSnapshot
): boolean {
  return (
    a.plan === b.plan &&
    a.status === b.status &&
    a.startDate === b.startDate &&
    a.expiration === b.expiration
  );
}

export function projectSubscriptionAuditSnapshot(
  existing: SubscriptionAuditSnapshotSource,
  updateData: Record<string, unknown>
): SubscriptionAuditSnapshot {
  return subscriptionAuditSnapshotFromRow({
    planId: (updateData.planId as string | number | undefined) ?? existing.planId,
    status: (updateData.status as SubscriptionAuditStatus | undefined) ?? existing.status,
    currentPeriodStart: existing.currentPeriodStart,
    currentPeriodEnd:
      (updateData.currentPeriodEnd as string | undefined) ?? existing.currentPeriodEnd,
  });
}
