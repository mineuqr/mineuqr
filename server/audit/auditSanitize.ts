/**
 * ADMIN-SECURITY-CENTER PR-5 — strip secrets from audit snapshots.
 */
import type { AuditEventInput, SanitizedAuditEvent } from "./auditTypes";
import { AUDIT_EVENT_VERSION } from "./auditTypes";
import { AuditValidationError } from "./auditTypes";

const SECRET_KEYS = new Set([
  "password",
  "newPassword",
  "passwordHash",
  "token",
  "tokenHash",
  "refreshToken",
  "accessToken",
  "secret",
]);

const MAX_EVENT_TYPE_LEN = 64;
const MAX_PROCEDURE_LEN = 128;
const MAX_CORRELATION_ID_LEN = 64;
const MAX_ACTOR_ROLE_LEN = 16;
const MAX_TARGET_TYPE_LEN = 32;
const MAX_IP_LEN = 45;

function truncate(value: string | null | undefined, maxLen: number): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= maxLen ? trimmed : trimmed.slice(0, maxLen);
}

function sanitizeJsonObject(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (SECRET_KEYS.has(key)) continue;
    if (raw === undefined) continue;
    out[key] = raw;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function defaultOpsCategory(category: AuditEventInput["category"]) {
  switch (category) {
    case "SECURITY":
      return "SECURITY" as const;
    case "SUBSCRIPTION":
    case "USER":
    case "COMMERCIAL":
    case "ACCESS":
    default:
      return "ADMIN" as const;
  }
}

export function sanitizeAuditEvent(input: AuditEventInput): SanitizedAuditEvent {
  const eventType = truncate(input.eventType, MAX_EVENT_TYPE_LEN);
  if (!eventType) {
    throw new AuditValidationError("eventType is required");
  }

  const eventVersion = input.eventVersion ?? AUDIT_EVENT_VERSION;
  if (!Number.isInteger(eventVersion) || eventVersion < 1) {
    throw new AuditValidationError("eventVersion must be a positive integer");
  }

  return {
    eventType,
    eventVersion,
    category: input.category,
    severity: input.severity,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    actorId: input.actorId ?? null,
    actorRole: truncate(input.actorRole, MAX_ACTOR_ROLE_LEN),
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    procedure: truncate(input.procedure, MAX_PROCEDURE_LEN),
    correlationId: truncate(input.correlationId, MAX_CORRELATION_ID_LEN),
    ip: truncate(input.ip, MAX_IP_LEN),
    before: sanitizeJsonObject(input.before),
    after: sanitizeJsonObject(input.after),
    metadata: sanitizeJsonObject(input.metadata),
    opsCategory: input.opsCategory ?? defaultOpsCategory(input.category),
    opsRoute: input.opsRoute,
    opsAction: input.opsAction,
  };
}
