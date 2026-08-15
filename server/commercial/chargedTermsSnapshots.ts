/**
 * COMMERCIAL-CHARGED-TERMS-LIVE-PLAN-SOURCE-OF-TRUTH-1
 * Insert-only Charged Terms snapshots. Current = latest effectiveFrom, then version.
 * Offer amount must already be the Live Plan current offer at commitment time.
 * Does not UPDATE historical snapshot rows. Does not read leftover Binding charged fields as price.
 * Does not read the legacy plan table.
 */
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { userSubscriptions } from "../../drizzle/schema";
import { commercialSubscriptionBindings } from "../db/schema/commercial/bindings";
import { commercialSubscriptionChargedTerms } from "../db/schema/commercial/chargedTerms";
import { newCommercialId, nowIso } from "../services/commercial-catalog/CatalogStore";

export const CHARGED_TERMS_SNAPSHOT_SOURCES = [
  "admin_create",
  "admin_update",
  "webhook_bind",
] as const;

export type ChargedTermsSnapshotSource =
  (typeof CHARGED_TERMS_SNAPSHOT_SOURCES)[number];

export type ChargedTermsSnapshotRow = {
  id: string;
  subscriptionId: number;
  planId: string;
  chargedAmount: string;
  chargedCurrency: string;
  billingCycleId: string | null;
  billingCycleCode: string;
  effectiveFrom: string;
  version: number;
  source: string;
  actorId: number | null;
};

export type ChargedTermsSnapshotOffer = {
  planId: string;
  chargedAmount: string;
  chargedCurrency: string;
  billingCycleId: string;
  billingCycleCode: string;
};

function isDuplicateKeyError(error: unknown): boolean {
  const err = error as { errno?: number; code?: string; message?: string };
  return (
    err.errno === 1062 ||
    err.code === "ER_DUP_ENTRY" ||
    /duplicate/i.test(String(err.message ?? ""))
  );
}

function snapshotFromRow(row: {
  id: string;
  subscriptionId: number;
  planId: string;
  chargedAmount: unknown;
  chargedCurrency: string;
  billingCycleId: string | null;
  billingCycleCode: string;
  effectiveFrom: string;
  version: number;
  source: string;
  actorId: number | null;
}): ChargedTermsSnapshotRow {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    planId: row.planId,
    chargedAmount: String(row.chargedAmount),
    chargedCurrency: row.chargedCurrency,
    billingCycleId: row.billingCycleId,
    billingCycleCode: row.billingCycleCode,
    effectiveFrom: String(row.effectiveFrom),
    version: row.version,
    source: row.source,
    actorId: row.actorId,
  };
}

export function chargedTermsSnapshotMatchesOffer(
  snapshot: Pick<
    ChargedTermsSnapshotRow,
    "planId" | "chargedAmount" | "chargedCurrency" | "billingCycleCode"
  >,
  offer: ChargedTermsSnapshotOffer
): boolean {
  return (
    snapshot.planId === offer.planId &&
    snapshot.chargedAmount === offer.chargedAmount &&
    snapshot.chargedCurrency === offer.chargedCurrency &&
    snapshot.billingCycleCode === offer.billingCycleCode
  );
}

/** CURRENT SNAPSHOT RULE: max(effectiveFrom), then max(version). */
export async function loadCurrentChargedTermsSnapshot(
  subscriptionId: number
): Promise<ChargedTermsSnapshotRow | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(commercialSubscriptionChargedTerms)
      .where(eq(commercialSubscriptionChargedTerms.subscriptionId, subscriptionId))
      .orderBy(
        desc(commercialSubscriptionChargedTerms.effectiveFrom),
        desc(commercialSubscriptionChargedTerms.version)
      )
      .limit(1);
    const row = rows[0];
    return row ? snapshotFromRow(row) : null;
  } catch {
    return null;
  }
}

export async function loadCurrentChargedTermsForSubscriptions(
  subscriptionIds: number[]
): Promise<ChargedTermsSnapshotRow[]> {
  if (subscriptionIds.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(commercialSubscriptionChargedTerms)
      .where(
        inArray(commercialSubscriptionChargedTerms.subscriptionId, subscriptionIds)
      )
      .orderBy(
        desc(commercialSubscriptionChargedTerms.effectiveFrom),
        desc(commercialSubscriptionChargedTerms.version)
      );
    const seen = new Set<number>();
    const current: ChargedTermsSnapshotRow[] = [];
    for (const row of rows) {
      if (seen.has(row.subscriptionId)) continue;
      seen.add(row.subscriptionId);
      current.push(snapshotFromRow(row));
    }
    return current;
  } catch {
    return [];
  }
}

export async function insertImmutableChargedTermsSnapshot(input: {
  subscriptionId: number;
  offer: ChargedTermsSnapshotOffer;
  source: ChargedTermsSnapshotSource;
  actorId?: number | null;
}): Promise<ChargedTermsSnapshotRow> {
  const amount = input.offer.chargedAmount?.trim() ?? "";
  const currency = input.offer.chargedCurrency?.trim() ?? "";
  if (!amount || !currency || !input.offer.billingCycleCode || !input.offer.planId) {
    throw new Error("charged_terms_snapshot_incomplete");
  }

  const current = await loadCurrentChargedTermsSnapshot(input.subscriptionId);
  if (current) {
    if (
      chargedTermsSnapshotMatchesOffer(current, input.offer) ||
      input.source === "webhook_bind"
    ) {
      /* webhook must not create Snapshot #2 from a later catalog price */
      return current;
    }
  }

  const db = await getDb();
  if (!db) {
    throw new Error("charged_terms_snapshot_persist_failed");
  }

  const now = nowIso();
  const row = {
    id: newCommercialId(),
    subscriptionId: input.subscriptionId,
    planId: input.offer.planId,
    chargedAmount: amount,
    chargedCurrency: currency,
    billingCycleId: input.offer.billingCycleId,
    billingCycleCode: input.offer.billingCycleCode,
    effectiveFrom: now,
    version: (current?.version ?? 0) + 1,
    source: input.source,
    actorId: input.actorId ?? null,
    createdAt: now,
  };

  try {
    await db.insert(commercialSubscriptionChargedTerms).values(row);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const raced = await loadCurrentChargedTermsSnapshot(input.subscriptionId);
      if (raced && chargedTermsSnapshotMatchesOffer(raced, input.offer)) {
        return raced;
      }
      throw new Error("charged_terms_snapshot_conflict");
    }
    throw new Error("charged_terms_snapshot_persist_failed");
  }

  return snapshotFromRow(row);
}

/**
 * Admin plan/cycle commercial change: snapshot first, then subscription identity.
 * Classification A — database transaction. Does not UPDATE old snapshots.
 */
export async function applyAdminCommercialIdentityChange(input: {
  subscriptionId: number;
  offer: ChargedTermsSnapshotOffer;
  subscriptionUpdate: Record<string, unknown>;
  actorId?: number | null;
}): Promise<ChargedTermsSnapshotRow> {
  const db = await getDb();
  if (!db) {
    throw new Error("charged_terms_snapshot_persist_failed");
  }

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(commercialSubscriptionChargedTerms)
      .where(
        eq(commercialSubscriptionChargedTerms.subscriptionId, input.subscriptionId)
      )
      .orderBy(
        desc(commercialSubscriptionChargedTerms.effectiveFrom),
        desc(commercialSubscriptionChargedTerms.version)
      )
      .limit(1);
    const existing = existingRows[0]
      ? snapshotFromRow(existingRows[0])
      : null;

    let snapshot: ChargedTermsSnapshotRow;
    if (existing && chargedTermsSnapshotMatchesOffer(existing, input.offer)) {
      snapshot = existing;
    } else {
      const now = nowIso();
      const inserted = {
        id: newCommercialId(),
        subscriptionId: input.subscriptionId,
        planId: input.offer.planId,
        chargedAmount: input.offer.chargedAmount,
        chargedCurrency: input.offer.chargedCurrency,
        billingCycleId: input.offer.billingCycleId,
        billingCycleCode: input.offer.billingCycleCode,
        effectiveFrom: now,
        version: (existing?.version ?? 0) + 1,
        source: "admin_update" as const,
        actorId: input.actorId ?? null,
        createdAt: now,
      };
      await tx.insert(commercialSubscriptionChargedTerms).values(inserted);
      snapshot = snapshotFromRow(inserted);
    }

    await tx
      .update(userSubscriptions)
      .set(input.subscriptionUpdate)
      .where(eq(userSubscriptions.id, input.subscriptionId));

    const enrollment = await tx
      .select({ id: commercialSubscriptionBindings.id })
      .from(commercialSubscriptionBindings)
      .where(
        eq(commercialSubscriptionBindings.subscriptionId, input.subscriptionId)
      )
      .limit(1);
    const touchedAt = nowIso();
    if (enrollment[0]) {
      await tx
        .update(commercialSubscriptionBindings)
        .set({ planId: input.offer.planId, updatedAt: touchedAt })
        .where(
          eq(commercialSubscriptionBindings.subscriptionId, input.subscriptionId)
        );
    } else {
      await tx.insert(commercialSubscriptionBindings).values({
        id: newCommercialId(),
        subscriptionId: input.subscriptionId,
        planId: input.offer.planId,
        chargedAmount: input.offer.chargedAmount,
        chargedCurrency: input.offer.chargedCurrency,
        billingCycleId: input.offer.billingCycleId,
        billingCycleCode: input.offer.billingCycleCode,
        createdAt: touchedAt,
        updatedAt: touchedAt,
      });
    }

    return snapshot;
  });
}
