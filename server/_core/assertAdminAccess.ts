import { NOT_ADMIN_ERR_MSG } from "@shared/const";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import { logUnauthorizedAdminAccess } from "./authAudit";
import { trackSuspiciousActivity } from "./suspiciousActivity";

/**
 * Ensures the caller is an authenticated admin (STAB-SEC-1A).
 * Use in admin mutations/queries instead of duplicating inline checks.
 */
export function assertAdminAccess(ctx: TrpcContext, procedure?: string): void {
  if (!ctx.user || ctx.user.role !== "admin") {
    logUnauthorizedAdminAccess(ctx.user, procedure);
    trackSuspiciousActivity({
      signal: "unauthorized_admin_access",
      category: "ADMIN",
      actorId: ctx.user?.id ?? null,
      role: ctx.user?.role ?? null,
      correlationId: ctx.correlationId,
      procedure: procedure ?? "unknown",
      action: "admin_access",
      metadata: { procedure: procedure ?? "unknown" },
    });
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
}

/** Prevents admins from modifying or deleting their own account via admin tools. */
export function assertNotSelfAdminTarget(
  ctx: TrpcContext,
  targetUserId: number,
  action: "update_role" | "delete_user"
): void {
  if (ctx.user?.id === targetUserId) {
    const message =
      action === "update_role"
        ? "لا يمكنك تعديل دورك الخاص"
        : "لا يمكنك حذف حسابك الخاص";
    throw new TRPCError({ code: "BAD_REQUEST", message });
  }
}
