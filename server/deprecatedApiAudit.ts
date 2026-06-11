/**
 * ADMIN-SECURITY-CENTER PR-9 — deprecated governance API observability.
 * Emits deprecated_api_used via dual-write audit pipeline (opsLog + audit_events).
 */
import type { TrpcContext } from "./_core/context";
import { emitAuditEvent } from "./audit/auditEmitter";
import { OPS_EVENT } from "./_core/opsTaxonomy";

/** Deprecated profile.* governance procedures and canonical admin.* replacements. */
export const DEPRECATED_PROFILE_GOVERNANCE_APIS = {
  "profile.listAllUsers": "admin.listAllUsers",
  "profile.updateUserRole": "admin.updateUserRole",
  "profile.deleteUser": "admin.deleteUser",
} as const;

export type DeprecatedProfileGovernanceProcedure =
  keyof typeof DEPRECATED_PROFILE_GOVERNANCE_APIS;

export function getDeprecatedApiReplacement(
  procedure: DeprecatedProfileGovernanceProcedure
): string {
  return DEPRECATED_PROFILE_GOVERNANCE_APIS[procedure];
}

/**
 * Record deprecated governance API usage. Never throws — caller behavior must not change.
 */
export function logDeprecatedApiUsed(
  ctx: TrpcContext,
  procedure: DeprecatedProfileGovernanceProcedure
): void {
  try {
    emitAuditEvent({
      eventType: OPS_EVENT.deprecated_api_used,
      category: "SECURITY",
      severity: "info",
      opsCategory: "ADMIN",
      correlationId: ctx.correlationId,
      actorId: ctx.user?.id ?? null,
      actorRole: ctx.user?.role ?? null,
      procedure,
      opsRoute: procedure,
      metadata: {
        api: procedure,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[DeprecatedApi] Failed to emit deprecated_api_used:", {
      procedure,
      error: message,
    });
  }
}
