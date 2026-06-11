/**
 * ADMIN-SECURITY-CENTER PR-5 — dual-write audit emitter (opsLog + audit_events).
 */
import type { OpsEvent } from "../_core/opsLog";
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import type { CascadeAuditContext } from "../db/cascadeDeletes";
import { sanitizeAuditEvent } from "./auditSanitize";
import { insertAuditEvent } from "./auditRepository";
import type { AuditCategory, AuditEventInput, SanitizedAuditEvent } from "./auditTypes";

type PersistFn = (event: SanitizedAuditEvent) => Promise<unknown>;

let persistFnOverride: PersistFn | null = null;

/** Test hook — override DB persistence without touching opsLog. */
export function setAuditPersistFnForTests(fn: PersistFn | null): void {
  persistFnOverride = fn;
}

function toOpsEvent(event: SanitizedAuditEvent): OpsEvent {
  return {
    type: event.eventType,
    category: event.opsCategory,
    severity: event.severity,
    ts: event.occurredAt,
    correlationId: event.correlationId ?? undefined,
    actorId: event.actorId,
    role: event.actorRole,
    route: event.opsRoute,
    procedure: event.procedure ?? undefined,
    action: event.opsAction,
    ip: event.ip ?? undefined,
    metadata: event.metadata ?? undefined,
  };
}

async function persistAuditEventSafely(event: SanitizedAuditEvent): Promise<void> {
  const persist = persistFnOverride ?? insertAuditEvent;
  try {
    await persist(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    opsLog({
      type: OPS_EVENT.audit_persist_failed,
      category: "SECURITY",
      severity: "error",
      ts: new Date().toISOString(),
      correlationId: event.correlationId ?? undefined,
      actorId: event.actorId,
      role: event.actorRole,
      procedure: event.procedure ?? undefined,
      metadata: {
        failedEventType: event.eventType,
        failedEventVersion: event.eventVersion,
        error: message,
        targetType: event.targetType,
        targetId: event.targetId,
      },
    });
    console.error("[Audit] Failed to persist audit event:", {
      eventType: event.eventType,
      error: message,
    });
  }
}

/**
 * Dual-write: opsLog (sync) then audit_events (async, non-blocking).
 * Never throws — business mutations must not depend on audit durability.
 */
export function emitAuditEvent(input: AuditEventInput): void {
  let sanitized: SanitizedAuditEvent;
  try {
    sanitized = sanitizeAuditEvent(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Audit] Invalid audit event input:", message);
    return;
  }

  opsLog(toOpsEvent(sanitized));
  void persistAuditEventSafely(sanitized);
}

function cascadeCategory(eventType: string): AuditCategory {
  switch (eventType) {
    case OPS_EVENT.cascade_subscription_deleted:
      return "SUBSCRIPTION";
    case OPS_EVENT.cascade_restaurant_deleted:
      return "COMMERCIAL";
    case OPS_EVENT.cascade_user_deleted:
      return "USER";
    default:
      return "COMMERCIAL";
  }
}

function cascadeTarget(
  eventType: string,
  metadata: Record<string, unknown>
): { targetType: AuditEventInput["targetType"]; targetId: number | null } {
  if (eventType === OPS_EVENT.cascade_subscription_deleted) {
    const subscriptionId = metadata.subscriptionId;
    return {
      targetType: "subscription",
      targetId: typeof subscriptionId === "number" ? subscriptionId : null,
    };
  }
  if (eventType === OPS_EVENT.cascade_restaurant_deleted) {
    const restaurantId = metadata.restaurantId;
    return {
      targetType: "restaurant",
      targetId: typeof restaurantId === "number" ? restaurantId : null,
    };
  }
  if (eventType === OPS_EVENT.cascade_user_deleted) {
    const targetUserId = metadata.targetUserId;
    return {
      targetType: "user",
      targetId: typeof targetUserId === "number" ? targetUserId : null,
    };
  }
  return { targetType: null, targetId: null };
}

export function emitCascadeAuditEvent(
  eventType: string,
  audit: CascadeAuditContext | undefined,
  metadata: Record<string, unknown>
): void {
  const before =
    metadata.before && typeof metadata.before === "object"
      ? (metadata.before as Record<string, unknown>)
      : null;
  const target = cascadeTarget(eventType, metadata);

  emitAuditEvent({
    eventType,
    category: cascadeCategory(eventType),
    severity: "info",
    opsCategory: "ADMIN",
    occurredAt: new Date().toISOString(),
    correlationId: audit?.correlationId,
    actorId: audit?.actorId ?? null,
    actorRole: audit?.role ?? null,
    targetType: target.targetType,
    targetId: target.targetId,
    procedure: audit?.procedure,
    ip: audit?.ip,
    opsAction: audit?.action,
    before,
    metadata: {
      legacyPrefix: "CascadeDelete",
      ...metadata,
    },
  });
}
