/**
 * ADMIN-SECURITY-CENTER PR-5 — persisted audit event types.
 */
import type { OpsCategory } from "../_core/opsLog";

export const AUDIT_EVENT_VERSION = 1 as const;

export type AuditCategory =
  | "ACCESS"
  | "USER"
  | "SUBSCRIPTION"
  | "COMMERCIAL"
  | "SECURITY";

export type AuditSeverity = "info" | "warn" | "error";

export type AuditTargetType =
  | "user"
  | "subscription"
  | "restaurant"
  | "platform"
  | "session";

export type AuditEventInput = {
  eventType: string;
  eventVersion?: number;
  category: AuditCategory;
  severity: AuditSeverity;
  occurredAt?: string;
  actorId?: number | null;
  actorRole?: string | null;
  targetType?: AuditTargetType | null;
  targetId?: number | null;
  procedure?: string | null;
  correlationId?: string | null;
  ip?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  /** opsLog transport category (may differ from persisted AuditCategory). */
  opsCategory?: OpsCategory;
  opsRoute?: string;
  opsAction?: string;
};

export type SanitizedAuditEvent = Required<
  Pick<AuditEventInput, "eventType" | "category" | "severity">
> & {
  eventVersion: number;
  occurredAt: string;
  actorId: number | null;
  actorRole: string | null;
  targetType: AuditTargetType | null;
  targetId: number | null;
  procedure: string | null;
  correlationId: string | null;
  ip: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  opsCategory: OpsCategory;
  opsRoute: string | undefined;
  opsAction: string | undefined;
};

export class AuditPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditPersistenceError";
  }
}

export class AuditValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditValidationError";
  }
}
