/**
 * ADMIN-SECURITY-CENTER PR-4 — admin password reset audit (opsLog only).
 */
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import type { TrpcContext } from "./_core/context";
import { emitAuditEvent } from "./audit/auditEmitter";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { getUserByEmail, updateUserPassword } from "./db";
import {
  assertProtectedUserPasswordResetAllowed,
  ProtectedUserModifyError,
} from "./db/cascadeDeletes";

export type AdminPasswordResetMethod = "admin_direct";

const PROTECTED_PASSWORD_MESSAGE = "لا يمكن إعادة تعيين كلمة مرور هذا المستخدم المحمي";

export function logAdminPasswordReset(params: {
  ctx: TrpcContext;
  procedure: string;
  targetUserId: number;
  targetUserEmail: string | null;
  resetMethod: AdminPasswordResetMethod;
}): void {
  emitAuditEvent({
    eventType: OPS_EVENT.admin_password_reset,
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
    metadata: {
      actorUserId: params.ctx.user?.id ?? null,
      actorRole: params.ctx.user?.role ?? null,
      targetUserId: params.targetUserId,
      targetUserEmail: params.targetUserEmail,
      resetMethod: params.resetMethod,
      correlationId: params.ctx.correlationId,
      procedure: params.procedure,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Shared admin password reset — used by admin.resetSubscriberPassword.
 * Emits admin_password_reset only when password update succeeds.
 */
export async function applyAdminPasswordReset(params: {
  ctx: TrpcContext;
  procedure: string;
  email: string;
  newPassword: string;
}) {
  const { ctx, procedure, email, newPassword } = params;

  const user = await getUserByEmail(email);
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
  }

  try {
    await assertProtectedUserPasswordResetAllowed(user.id);
  } catch (error) {
    if (error instanceof ProtectedUserModifyError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: PROTECTED_PASSWORD_MESSAGE,
      });
    }
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updateUserPassword(user.openId, passwordHash);

  logAdminPasswordReset({
    ctx,
    procedure,
    targetUserId: user.id,
    targetUserEmail: user.email ?? null,
    resetMethod: "admin_direct",
  });

  return { success: true as const };
}
