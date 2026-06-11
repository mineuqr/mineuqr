/**
 * ADMIN-SECURITY-CENTER PR-6 — audit_events read boundary.
 * Only this module performs SELECT/aggregate queries on audit_events.
 */
import { and, desc, eq, gte, lte, lt, sql } from "drizzle-orm";
import { auditEvents, type SelectAuditEvent } from "../../drizzle/schema";
import { getDb } from "../db";
import type { AuditCategory, AuditSeverity } from "./auditTypes";
import { startOfUtcDay } from "./auditQueryLimits";

export type AuditEventListFilter = {
  eventType?: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  actorId?: number;
  targetType?: string;
  targetId?: number;
  correlationId?: string;
  from?: Date;
  to?: Date;
};

export type AuditEventListResult = {
  items: SelectAuditEvent[];
  nextCursor: number | null;
};

export type AuditEventStatsResult = {
  total: number;
  today: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  range: { from: string; to: string };
};

export type AuditPersistenceProbe = {
  databaseAvailable: boolean;
  auditTableReadable: boolean;
};

function buildListConditions(filter: AuditEventListFilter) {
  const conditions = [];
  if (filter.eventType) conditions.push(eq(auditEvents.eventType, filter.eventType));
  if (filter.category) conditions.push(eq(auditEvents.category, filter.category));
  if (filter.severity) conditions.push(eq(auditEvents.severity, filter.severity));
  if (filter.actorId !== undefined) conditions.push(eq(auditEvents.actorId, filter.actorId));
  if (filter.targetType) conditions.push(eq(auditEvents.targetType, filter.targetType));
  if (filter.targetId !== undefined) conditions.push(eq(auditEvents.targetId, filter.targetId));
  if (filter.correlationId) conditions.push(eq(auditEvents.correlationId, filter.correlationId));
  if (filter.from) conditions.push(gte(auditEvents.occurredAt, filter.from.toISOString()));
  if (filter.to) conditions.push(lte(auditEvents.occurredAt, filter.to.toISOString()));
  return conditions;
}

export async function listAuditEvents(params: {
  filter: AuditEventListFilter;
  limit: number;
  cursor?: number;
}): Promise<AuditEventListResult> {
  const db = await getDb();
  if (!db) {
    return { items: [], nextCursor: null };
  }

  const conditions = buildListConditions(params.filter);
  if (params.cursor !== undefined) {
    conditions.push(lt(auditEvents.id, params.cursor));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(auditEvents)
    .where(whereClause)
    .orderBy(desc(auditEvents.id))
    .limit(params.limit + 1);

  const hasMore = rows.length > params.limit;
  const items = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

  return { items, nextCursor };
}

export async function getAuditEventById(id: number): Promise<SelectAuditEvent | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(auditEvents).where(eq(auditEvents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAuditEventStats(params: {
  from: Date;
  to: Date;
}): Promise<AuditEventStatsResult> {
  const db = await getDb();
  const fromIso = params.from.toISOString();
  const toIso = params.to.toISOString();
  const todayStart = startOfUtcDay(new Date()).toISOString();

  if (!db) {
    return {
      total: 0,
      today: 0,
      byCategory: {},
      bySeverity: {},
      range: { from: fromIso, to: toIso },
    };
  }

  const rangeCondition = and(
    gte(auditEvents.occurredAt, fromIso),
    lte(auditEvents.occurredAt, toIso)
  );

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(rangeCondition);

  const [todayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(gte(auditEvents.occurredAt, todayStart));

  const categoryRows = await db
    .select({
      category: auditEvents.category,
      count: sql<number>`count(*)`,
    })
    .from(auditEvents)
    .where(rangeCondition)
    .groupBy(auditEvents.category);

  const severityRows = await db
    .select({
      severity: auditEvents.severity,
      count: sql<number>`count(*)`,
    })
    .from(auditEvents)
    .where(rangeCondition)
    .groupBy(auditEvents.severity);

  const byCategory: Record<string, number> = {};
  for (const row of categoryRows) {
    byCategory[row.category] = Number(row.count);
  }

  const bySeverity: Record<string, number> = {};
  for (const row of severityRows) {
    bySeverity[row.severity] = Number(row.count);
  }

  return {
    total: Number(totalRow?.count ?? 0),
    today: Number(todayRow?.count ?? 0),
    byCategory,
    bySeverity,
    range: { from: fromIso, to: toIso },
  };
}

export async function probeAuditPersistence(): Promise<AuditPersistenceProbe> {
  const db = await getDb();
  if (!db) {
    return { databaseAvailable: false, auditTableReadable: false };
  }

  try {
    await db.select({ id: auditEvents.id }).from(auditEvents).limit(1);
    return { databaseAvailable: true, auditTableReadable: true };
  } catch {
    return { databaseAvailable: true, auditTableReadable: false };
  }
}
