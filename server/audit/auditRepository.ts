/**
 * ADMIN-SECURITY-CENTER PR-5 — audit_events persistence boundary.
 * Only this module performs INSERT into audit_events.
 */
import { auditEvents } from "../../drizzle/schema";
import { getDb } from "../db";
import type { SanitizedAuditEvent } from "./auditTypes";
import { AuditPersistenceError } from "./auditTypes";

export type InsertedAuditEvent = {
  id: number;
};

export async function insertAuditEvent(event: SanitizedAuditEvent): Promise<InsertedAuditEvent> {
  const db = await getDb();
  if (!db) {
    throw new AuditPersistenceError("Database not available");
  }

  const result = await db.insert(auditEvents).values({
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    category: event.category,
    severity: event.severity,
    occurredAt: event.occurredAt,
    actorId: event.actorId,
    actorRole: event.actorRole,
    targetType: event.targetType,
    targetId: event.targetId,
    procedure: event.procedure,
    correlationId: event.correlationId,
    ip: event.ip,
    before: event.before,
    after: event.after,
    metadata: event.metadata,
  });

  const insertId = Number(result[0].insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new AuditPersistenceError("audit_events insert did not return an id");
  }

  return { id: insertId };
}
