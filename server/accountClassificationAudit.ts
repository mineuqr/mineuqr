import type { TrpcContext } from "./_core/context";
import { emitAuditEvent } from "./audit/auditEmitter";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import type { AccountClassification, InternalStaffCategory } from "@shared/accountClassification";

export function logAccountClassificationChanged(params: {
  ctx: TrpcContext;
  procedure: string;
  targetUserId: number;
  previousClassification: AccountClassification;
  nextClassification: AccountClassification;
}): void {
  emitAuditEvent({
    eventType: OPS_EVENT.account_classification_changed,
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
      accountClassification: params.previousClassification,
    },
    after: {
      userId: params.targetUserId,
      accountClassification: params.nextClassification,
    },
    metadata: {
      targetUserId: params.targetUserId,
      previousClassification: params.previousClassification,
      nextClassification: params.nextClassification,
      procedure: params.procedure,
    },
  });
}

export function logInternalUserCreated(params: {
  ctx: TrpcContext;
  procedure: string;
  userId: number;
  email: string;
  role: "user" | "admin";
  staffCategory: InternalStaffCategory;
}): void {
  emitAuditEvent({
    eventType: OPS_EVENT.internal_user_created,
    category: "USER",
    severity: "info",
    opsCategory: "ADMIN",
    correlationId: params.ctx.correlationId,
    actorId: params.ctx.user?.id ?? null,
    actorRole: params.ctx.user?.role ?? null,
    targetType: "user",
    targetId: params.userId,
    procedure: params.procedure,
    opsRoute: params.procedure,
    after: {
      userId: params.userId,
      email: params.email,
      role: params.role,
      staffCategory: params.staffCategory,
      accountClassification: "INTERNAL",
    },
    metadata: {
      userId: params.userId,
      email: params.email,
      role: params.role,
      staffCategory: params.staffCategory,
      accountClassification: "INTERNAL",
      procedure: params.procedure,
    },
  });
}
