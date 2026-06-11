/**
 * ADMIN-SECURITY-CENTER PR-2 — role change audit (opsLog only).
 */
import { TRPCError } from "@trpc/server";
import type { AccountClassification } from "@shared/accountClassification";
import type { TrpcContext } from "./_core/context";
import { assertNotSelfAdminTarget } from "./_core/assertAdminAccess";
import { emitAuditEvent } from "./audit/auditEmitter";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { getUserById, updateUserRole } from "./db";
import {
  assertProtectedUserRoleModifiable,
  ProtectedUserModifyError,
} from "./db/cascadeDeletes";

export type UserRole = "user" | "admin";

export function logUserRoleChanged(params: {
  ctx: TrpcContext;
  procedure: string;
  targetUserId: number;
  targetUserEmail: string | null;
  previousRole: UserRole;
  newRole: UserRole;
  accountClassification?: AccountClassification;
}): void {
  emitAuditEvent({
    eventType: OPS_EVENT.user_role_changed,
    category: "USER",
    severity: "info",
    opsCategory: "ADMIN",
    correlationId: params.ctx.correlationId,
    actorId: params.ctx.user?.id ?? null,
    actorRole: params.ctx.user?.role ?? null,
    targetType: "user",
    targetId: params.targetUserId,
    procedure: params.procedure,
    opsRoute: params.procedure,
    before: {
      userId: params.targetUserId,
      role: params.previousRole,
      accountClassification: params.accountClassification,
    },
    after: {
      userId: params.targetUserId,
      role: params.newRole,
      accountClassification: params.accountClassification,
    },
    metadata: {
      actorUserId: params.ctx.user?.id ?? null,
      actorRole: params.ctx.user?.role ?? null,
      targetUserId: params.targetUserId,
      targetUserEmail: params.targetUserEmail,
      previousRole: params.previousRole,
      newRole: params.newRole,
      accountClassification: params.accountClassification,
      procedure: params.procedure,
    },
  });
}

const PROTECTED_ROLE_MESSAGE = "لا يمكن تعديل دور هذا المستخدم المحمي";

/**
 * Shared admin role update — used by admin.updateUserRole.
 * Emits user_role_changed only when role actually changes and update succeeds.
 */
export async function applyAdminUserRoleUpdate(params: {
  ctx: TrpcContext;
  procedure: string;
  userId: number;
  role: UserRole;
}) {
  const { ctx, procedure, userId, role } = params;

  assertNotSelfAdminTarget(ctx, userId, "update_role");

  try {
    await assertProtectedUserRoleModifiable(userId);
  } catch (error) {
    if (error instanceof ProtectedUserModifyError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: PROTECTED_ROLE_MESSAGE,
      });
    }
    throw error;
  }

  const target = await getUserById(userId);
  const previousRole = target?.role;

  if (target && previousRole === role) {
    return null;
  }

  const result = await updateUserRole(userId, role);

  if (target && previousRole && previousRole !== role) {
    logUserRoleChanged({
      ctx,
      procedure,
      targetUserId: userId,
      targetUserEmail: target.email ?? null,
      previousRole,
      newRole: role,
      accountClassification: target.accountClassification,
    });
  }

  return result;
}
