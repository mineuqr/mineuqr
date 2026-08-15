/**
 * COMMERCIAL-ADMIN-FREE-PERIOD-IMPLEMENTATION-1
 * Insert-only commercial concession versions. Current = status active AND now < endsAt.
 * Does not write Charged Terms. Does not use the legacy plan table as price.
 */
import { desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { userSubscriptions } from "../../drizzle/schema";
import { commercialSubscriptionBindings } from "../db/schema/commercial/bindings";
import { commercialSubscriptionConcessions } from "../db/schema/commercial/concessions";
import { newCommercialId, nowIso } from "../services/commercial-catalog/CatalogStore";
import { emitAuditEvent } from "../audit/auditEmitter";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  computeConcessionEndsAt,
  isConcessionCurrent,
  isConcessionUnit,
  validateConcessionDuration,
  type ConcessionUnit,
} from "@shared/commercial-concession";

export const CONCESSION_SOURCES = [
  "admin_grant",
  "admin_revise",
  "admin_cancel",
  "admin_reactivate",
] as const;

export type ConcessionSource = (typeof CONCESSION_SOURCES)[number];

export type ConcessionStatus =
  | "active"
  | "superseded"
  | "expired"
  | "cancelled";

export type CommercialConcessionRow = {
  id: string;
  subscriptionId: number;
  planId: string;
  billingCycleCode: string;
  unit: ConcessionUnit;
  duration: number;
  startsAt: string;
  endsAt: string;
  status: ConcessionStatus;
  version: number;
  source: string;
  actorId: number | null;
  reason: string;
  supersededBy: string | null;
  cancelledAt: string | null;
};

export type ConcessionInput = {
  unit: ConcessionUnit;
  duration: number;
  reason: string;
};

export class CommercialConcessionError extends Error {
  readonly code:
    | "invalid_unit"
    | "zero_duration"
    | "negative_duration"
    | "invalid_duration"
    | "invalid_reason"
    | "overlap"
    | "not_found"
    | "not_current"
    | "invalid_status"
    | "shorten_in_past"
    | "persist_failed"
    | "trial_conflict";

  constructor(code: CommercialConcessionError["code"]) {
    super(code);
    this.name = "CommercialConcessionError";
    this.code = code;
  }
}

export function rethrowConcessionAsTrpc(error: unknown): never {
  if (error instanceof CommercialConcessionError) {
    const code =
      error.code === "overlap"
        ? "CONFLICT"
        : error.code === "not_found"
          ? "NOT_FOUND"
          : "BAD_REQUEST";
    throw new TRPCError({ code, message: error.code });
  }
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({ code: "PRECONDITION_FAILED", message: "concession_persist_failed" });
}

function normalizeReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 512) {
    throw new CommercialConcessionError("invalid_reason");
  }
  return trimmed;
}

function parseUnit(unit: string): ConcessionUnit {
  if (!isConcessionUnit(unit)) {
    throw new CommercialConcessionError("invalid_unit");
  }
  return unit;
}

function assertDuration(unit: ConcessionUnit, duration: number): void {
  const check = validateConcessionDuration(unit, duration);
  if (check.ok) return;
  if (check.reason === "zero") throw new CommercialConcessionError("zero_duration");
  if (check.reason === "negative") throw new CommercialConcessionError("negative_duration");
  throw new CommercialConcessionError("invalid_duration");
}

function rowFromDb(row: {
  id: string;
  subscriptionId: number;
  planId: string;
  billingCycleCode: string;
  unit: string;
  duration: number;
  startsAt: string;
  endsAt: string;
  status: string;
  version: number;
  source: string;
  actorId: number | null;
  reason: string;
  supersededBy: string | null;
  cancelledAt: string | null;
}): CommercialConcessionRow {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    planId: row.planId,
    billingCycleCode: row.billingCycleCode,
    unit: parseUnit(row.unit),
    duration: row.duration,
    startsAt: String(row.startsAt),
    endsAt: String(row.endsAt),
    status: row.status as ConcessionStatus,
    version: row.version,
    source: row.source,
    actorId: row.actorId,
    reason: row.reason,
    supersededBy: row.supersededBy,
    cancelledAt: row.cancelledAt ? String(row.cancelledAt) : null,
  };
}

function isCurrentRow(row: CommercialConcessionRow, now: Date): boolean {
  return isConcessionCurrent(row.status, row.endsAt, now);
}

async function getDbOrNull() {
  const getter = getDb;
  if (typeof getter !== "function") return null;
  try {
    return await getter();
  } catch {
    return null;
  }
}

export async function loadCurrentCommercialConcession(
  subscriptionId: number,
  now: Date = new Date()
): Promise<CommercialConcessionRow | null> {
  const db = await getDbOrNull();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(commercialSubscriptionConcessions)
      .where(eq(commercialSubscriptionConcessions.subscriptionId, subscriptionId))
      .orderBy(desc(commercialSubscriptionConcessions.version));
    for (const raw of rows) {
      const row = rowFromDb(raw);
      if (isCurrentRow(row, now)) return row;
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadSubscriptionIdsWithCurrentConcession(
  subscriptionIds: number[],
  now: Date = new Date()
): Promise<Set<number>> {
  const suppressed = new Set<number>();
  if (subscriptionIds.length === 0) return suppressed;
  const db = await getDbOrNull();
  if (!db) return suppressed;
  try {
    const rows = await db
      .select()
      .from(commercialSubscriptionConcessions)
      .where(inArray(commercialSubscriptionConcessions.subscriptionId, subscriptionIds))
      .orderBy(desc(commercialSubscriptionConcessions.version));
    const seen = new Set<number>();
    for (const raw of rows) {
      if (seen.has(raw.subscriptionId)) continue;
      seen.add(raw.subscriptionId);
      const row = rowFromDb(raw);
      if (isCurrentRow(row, now)) suppressed.add(row.subscriptionId);
    }
    return suppressed;
  } catch {
    return suppressed;
  }
}

function matchesGrant(
  current: CommercialConcessionRow,
  input: ConcessionInput
): boolean {
  return current.unit === input.unit && current.duration === input.duration;
}

async function latestVersion(
  subscriptionId: number
): Promise<{ version: number; row: CommercialConcessionRow | null }> {
  const db = await getDbOrNull();
  if (!db) throw new CommercialConcessionError("persist_failed");
  const rows = await db
    .select()
    .from(commercialSubscriptionConcessions)
    .where(eq(commercialSubscriptionConcessions.subscriptionId, subscriptionId))
    .orderBy(desc(commercialSubscriptionConcessions.version))
    .limit(1);
  if (!rows[0]) return { version: 0, row: null };
  return { version: rows[0].version, row: rowFromDb(rows[0]) };
}

function emitConcessionAudit(input: {
  eventType: string;
  actorId: number | null;
  subscriptionId: number;
  before: CommercialConcessionRow | null;
  after: CommercialConcessionRow;
  action: string;
}): void {
  try {
    emitAuditEvent({
      eventType: input.eventType,
      category: "COMMERCIAL",
      severity: "info",
      opsCategory: "ADMIN",
      actorId: input.actorId,
      targetType: "subscription",
      targetId: input.subscriptionId,
      before: input.before
        ? {
            id: input.before.id,
            status: input.before.status,
            unit: input.before.unit,
            duration: input.before.duration,
            endsAt: input.before.endsAt,
            version: input.before.version,
          }
        : null,
      after: {
        id: input.after.id,
        status: input.after.status,
        unit: input.after.unit,
        duration: input.after.duration,
        endsAt: input.after.endsAt,
        version: input.after.version,
        reason: input.after.reason,
      },
      metadata: { action: input.action, source: input.after.source },
    });
  } catch {
    /* audit must not reverse persist */
  }
}

export async function insertConcessionVersion(input: {
  subscriptionId: number;
  planId: string;
  billingCycleCode: string;
  unit: ConcessionUnit;
  duration: number;
  reason: string;
  source: ConcessionSource;
  actorId?: number | null;
  startsAt?: Date;
  supersede?: CommercialConcessionRow | null;
}): Promise<CommercialConcessionRow> {
  const unit = parseUnit(input.unit);
  assertDuration(unit, input.duration);
  const reason = normalizeReason(input.reason);
  const db = await getDbOrNull();
  if (!db) throw new CommercialConcessionError("persist_failed");

  const startsAt = input.startsAt ?? new Date();
  const endsAt = computeConcessionEndsAt(startsAt, unit, input.duration);
  if (!(endsAt > startsAt)) {
    throw new CommercialConcessionError("invalid_duration");
  }

  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(commercialSubscriptionConcessions)
      .where(eq(commercialSubscriptionConcessions.subscriptionId, input.subscriptionId))
      .orderBy(desc(commercialSubscriptionConcessions.version));
    const latest = existing[0] ? rowFromDb(existing[0]) : null;
    const current = existing
      .map(rowFromDb)
      .find((row) => isCurrentRow(row, startsAt));

    if (current && input.source === "admin_grant") {
      if (current.unit === unit && current.duration === input.duration) {
        return current;
      }
      throw new CommercialConcessionError("overlap");
    }
    if (input.source === "admin_revise" && !current) {
      throw new CommercialConcessionError("not_current");
    }

    const now = nowIso();
    const inserted: CommercialConcessionRow = {
      id: newCommercialId(),
      subscriptionId: input.subscriptionId,
      planId: input.planId,
      billingCycleCode: input.billingCycleCode,
      unit,
      duration: input.duration,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: "active",
      version: (latest?.version ?? 0) + 1,
      source: input.source,
      actorId: input.actorId ?? null,
      reason,
      supersededBy: null,
      cancelledAt: null,
    };

    if (current) {
      await tx
        .update(commercialSubscriptionConcessions)
        .set({ status: "superseded", supersededBy: inserted.id })
        .where(eq(commercialSubscriptionConcessions.id, current.id));
    }

    await tx.insert(commercialSubscriptionConcessions).values({
      ...inserted,
      createdAt: now,
    });

    return inserted;
  });
}

export async function grantCommercialConcession(input: {
  subscriptionId: number;
  planId: string;
  billingCycleCode: string;
  unit: string;
  duration: number;
  reason: string;
  actorId?: number | null;
  alignPeriodEnd?: boolean;
}): Promise<CommercialConcessionRow> {
  const unit = parseUnit(input.unit);
  assertDuration(unit, input.duration);
  const reason = normalizeReason(input.reason);
  const now = new Date();
  const current = await loadCurrentCommercialConcession(input.subscriptionId, now);
  if (current && matchesGrant(current, { unit, duration: input.duration, reason })) {
    return current;
  }
  if (current) {
    throw new CommercialConcessionError("overlap");
  }

  const row = await insertConcessionVersion({
    subscriptionId: input.subscriptionId,
    planId: input.planId,
    billingCycleCode: input.billingCycleCode,
    unit,
    duration: input.duration,
    reason,
    source: "admin_grant",
    actorId: input.actorId,
    startsAt: now,
  });

  if (input.alignPeriodEnd !== false) {
    await alignSubscriptionPeriodEnd(input.subscriptionId, row.endsAt);
  }

  emitConcessionAudit({
    eventType: OPS_EVENT.commercial_concession_granted,
    actorId: input.actorId ?? null,
    subscriptionId: input.subscriptionId,
    before: null,
    after: row,
    action: "grant",
  });
  return row;
}

export async function reviseCommercialConcession(input: {
  subscriptionId: number;
  unit: string;
  duration: number;
  reason: string;
  actorId?: number | null;
}): Promise<CommercialConcessionRow> {
  const unit = parseUnit(input.unit);
  assertDuration(unit, input.duration);
  const reason = normalizeReason(input.reason);
  const now = new Date();
  const current = await loadCurrentCommercialConcession(input.subscriptionId, now);
  if (!current) throw new CommercialConcessionError("not_current");
  if (matchesGrant(current, { unit, duration: input.duration, reason })) {
    return current;
  }

  const proposedEnd = computeConcessionEndsAt(now, unit, input.duration);
  if (!(proposedEnd > now)) {
    throw new CommercialConcessionError("shorten_in_past");
  }

  const row = await insertConcessionVersion({
    subscriptionId: input.subscriptionId,
    planId: current.planId,
    billingCycleCode: current.billingCycleCode,
    unit,
    duration: input.duration,
    reason,
    source: "admin_revise",
    actorId: input.actorId,
    startsAt: now,
    supersede: current,
  });

  await alignSubscriptionPeriodEnd(input.subscriptionId, row.endsAt);

  emitConcessionAudit({
    eventType: OPS_EVENT.commercial_concession_revised,
    actorId: input.actorId ?? null,
    subscriptionId: input.subscriptionId,
    before: current,
    after: row,
    action: "revise",
  });
  return row;
}

export async function cancelCommercialConcession(input: {
  subscriptionId: number;
  reason: string;
  actorId?: number | null;
  expirePeriodIfUnpaid?: boolean;
}): Promise<CommercialConcessionRow | null> {
  const reason = normalizeReason(input.reason);
  const now = new Date();
  const current = await loadCurrentCommercialConcession(input.subscriptionId, now);
  if (!current) {
    const latest = await latestVersion(input.subscriptionId);
    return latest.row;
  }

  const db = await getDbOrNull();
  if (!db) throw new CommercialConcessionError("persist_failed");
  const cancelledAt = now.toISOString();
  await db
    .update(commercialSubscriptionConcessions)
    .set({
      status: "cancelled",
      cancelledAt,
    })
    .where(eq(commercialSubscriptionConcessions.id, current.id));

  const after: CommercialConcessionRow = {
    ...current,
    status: "cancelled",
    cancelledAt,
    reason,
  };

  if (input.expirePeriodIfUnpaid) {
    await db
      .update(userSubscriptions)
      .set({ currentPeriodEnd: cancelledAt })
      .where(eq(userSubscriptions.id, input.subscriptionId));
  }

  emitConcessionAudit({
    eventType: OPS_EVENT.commercial_concession_cancelled,
    actorId: input.actorId ?? null,
    subscriptionId: input.subscriptionId,
    before: current,
    after,
    action: "cancel",
  });
  return after;
}

async function alignSubscriptionPeriodEnd(
  subscriptionId: number,
  endsAt: string
): Promise<void> {
  const db = await getDbOrNull();
  if (!db) return;
  const rows = await db
    .select({ currentPeriodEnd: userSubscriptions.currentPeriodEnd })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.id, subscriptionId))
    .limit(1);
  const currentEnd = rows[0]?.currentPeriodEnd
    ? new Date(rows[0].currentPeriodEnd).getTime()
    : 0;
  const nextEnd = new Date(endsAt).getTime();
  if (!Number.isFinite(nextEnd)) return;
  if (nextEnd > currentEnd) {
    await db
      .update(userSubscriptions)
      .set({ currentPeriodEnd: endsAt })
      .where(eq(userSubscriptions.id, subscriptionId));
  }
}

export async function updateEnrollmentPlanIdOnly(
  subscriptionId: number,
  planId: string
): Promise<void> {
  const db = await getDbOrNull();
  if (!db) return;
  const enrollment = await db
    .select({ id: commercialSubscriptionBindings.id })
    .from(commercialSubscriptionBindings)
    .where(eq(commercialSubscriptionBindings.subscriptionId, subscriptionId))
    .limit(1);
  if (!enrollment[0]) return;
  await db
    .update(commercialSubscriptionBindings)
    .set({ planId, updatedAt: nowIso() })
    .where(eq(commercialSubscriptionBindings.subscriptionId, subscriptionId));
}

export async function persistAdminFreeFirstConcession(input: {
  subscriptionId: number;
  planId: string;
  billingCycleCode: string;
  unit: string;
  duration: number;
  reason: string;
  actorId?: number | null;
}): Promise<CommercialConcessionRow> {
  return grantCommercialConcession({
    ...input,
    alignPeriodEnd: true,
  });
}

/**
 * Free Admin Reactivation: new concession from now + activate the same row.
 * Does not write Charged Terms. Does not restore a cancelled concession.
 * Classification A — one transaction.
 */
export async function applyAdminFreeReactivation(input: {
  subscriptionId: number;
  planId: string;
  billingCycleCode: string;
  unit: string;
  duration: number;
  reason: string;
  actorId?: number | null;
  subscriptionUpdate: Record<string, unknown>;
}): Promise<CommercialConcessionRow> {
  const unit = parseUnit(input.unit);
  assertDuration(unit, input.duration);
  const reason = normalizeReason(input.reason);
  const startsAt = new Date();
  const endsAt = computeConcessionEndsAt(startsAt, unit, input.duration);
  if (!(endsAt > startsAt)) {
    throw new CommercialConcessionError("invalid_duration");
  }

  const db = await getDbOrNull();
  if (!db) throw new CommercialConcessionError("persist_failed");

  const row = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(commercialSubscriptionConcessions)
      .where(eq(commercialSubscriptionConcessions.subscriptionId, input.subscriptionId))
      .orderBy(desc(commercialSubscriptionConcessions.version));
    const latest = existing[0] ? rowFromDb(existing[0]) : null;
    const current = existing.map(rowFromDb).find((item) => isCurrentRow(item, startsAt));
    if (current) {
      throw new CommercialConcessionError("overlap");
    }

    const now = nowIso();
    const inserted: CommercialConcessionRow = {
      id: newCommercialId(),
      subscriptionId: input.subscriptionId,
      planId: input.planId,
      billingCycleCode: input.billingCycleCode,
      unit,
      duration: input.duration,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: "active",
      version: (latest?.version ?? 0) + 1,
      source: "admin_reactivate",
      actorId: input.actorId ?? null,
      reason,
      supersededBy: null,
      cancelledAt: null,
    };

    await tx.insert(commercialSubscriptionConcessions).values({
      ...inserted,
      createdAt: now,
    });

    await tx
      .update(userSubscriptions)
      .set({
        ...input.subscriptionUpdate,
        currentPeriodEnd: inserted.endsAt,
      })
      .where(eq(userSubscriptions.id, input.subscriptionId));

    const enrollment = await tx
      .select({ id: commercialSubscriptionBindings.id })
      .from(commercialSubscriptionBindings)
      .where(eq(commercialSubscriptionBindings.subscriptionId, input.subscriptionId))
      .limit(1);
    if (enrollment[0]) {
      await tx
        .update(commercialSubscriptionBindings)
        .set({ planId: input.planId, updatedAt: now })
        .where(eq(commercialSubscriptionBindings.subscriptionId, input.subscriptionId));
    }

    return inserted;
  });

  emitConcessionAudit({
    eventType: OPS_EVENT.commercial_concession_granted,
    actorId: input.actorId ?? null,
    subscriptionId: input.subscriptionId,
    before: null,
    after: row,
    action: "reactivate",
  });
  return row;
}
