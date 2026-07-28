/** ADMIN-SECURITY-CENTER PR-8 — audit event display helpers (pure, testable). */

import type { SubscriptionChangeEventType } from "./auditEventConstants";

export type AuditJsonRecord = Record<string, unknown> | null | undefined;

function asAuditJsonRecord(value: unknown): AuditJsonRecord {
  if (value == null) return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export type RoleChangeDisplay = {
  actorId: number | null;
  targetUserId: number | null;
  previousRole: string | null;
  newRole: string | null;
};

export function formatAuditTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(date);
}

export function formatAuditActorLabel(actorId: number | null | undefined): string {
  if (actorId == null) return "—";
  return `#${actorId}`;
}

export function formatAuditTargetLabel(
  targetType: string | null | undefined,
  targetId: number | null | undefined
): string {
  if (targetId == null) return "—";
  if (targetType) return `${targetType} #${targetId}`;
  return `#${targetId}`;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function extractRoleChangeDisplay(event: {
  actorId?: number | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  targetId?: number | null;
}): RoleChangeDisplay {
  const metadata = asAuditJsonRecord(event.metadata);
  const before = asAuditJsonRecord(event.before);
  const after = asAuditJsonRecord(event.after);

  return {
    actorId: event.actorId ?? readNumber(metadata?.actorUserId),
    targetUserId:
      event.targetId ??
      readNumber(metadata?.targetUserId) ??
      readNumber(before?.userId) ??
      readNumber(after?.userId),
    previousRole:
      readString(metadata?.previousRole) ?? readString(before?.role),
    newRole: readString(metadata?.newRole) ?? readString(after?.role),
  };
}

function summarizeSnapshot(snapshot: AuditJsonRecord): string | null {
  if (!snapshot) return null;
  const plan = snapshot.plan;
  const status = snapshot.status;
  const parts: string[] = [];
  if (plan !== undefined) parts.push(`plan ${String(plan)}`);
  if (status !== undefined) parts.push(String(status));
  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatSubscriptionChangeSummary(event: {
  eventType: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}): { beforeSummary: string; afterSummary: string } {
  const metadata = asAuditJsonRecord(event.metadata);
  const metaBefore = asAuditJsonRecord(metadata?.before);
  const metaAfter = asAuditJsonRecord(metadata?.after);

  const beforeSummary =
    summarizeSnapshot(asAuditJsonRecord(event.before)) ??
    summarizeSnapshot(metaBefore) ??
    "—";

  const afterSummary =
    summarizeSnapshot(asAuditJsonRecord(event.after)) ??
    summarizeSnapshot(metaAfter) ??
    (event.eventType === "cascade_subscription_deleted" ? "deleted" : "—");

  return { beforeSummary, afterSummary };
}

export function isSubscriptionChangeEventType(
  eventType: string
): eventType is SubscriptionChangeEventType {
  return (
    eventType === "subscription_created_by_admin" ||
    eventType === "subscription_updated_by_admin" ||
    eventType === "cascade_subscription_deleted"
  );
}

export function stringifyAuditJson(value: unknown): string {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function appendAuditEventPage<T extends { id: number }>(
  existing: T[],
  page: T[]
): T[] {
  if (page.length === 0) return existing;
  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];
  for (const item of page) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}
