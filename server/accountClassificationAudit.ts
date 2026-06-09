import type { TrpcContext } from "./_core/context";
import { opsLog } from "./_core/opsLog";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import type { AccountClassification, InternalStaffCategory } from "@shared/accountClassification";

export function logAccountClassificationChanged(params: {
  ctx: TrpcContext;
  procedure: string;
  targetUserId: number;
  previousClassification: AccountClassification;
  nextClassification: AccountClassification;
}): void {
  opsLog({
    type: OPS_EVENT.account_classification_changed,
    category: "ADMIN",
    severity: "info",
    ts: new Date().toISOString(),
    correlationId: params.ctx.correlationId,
    actorId: params.ctx.user?.id ?? null,
    role: params.ctx.user?.role ?? null,
    route: params.procedure,
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
  opsLog({
    type: OPS_EVENT.internal_user_created,
    category: "ADMIN",
    severity: "info",
    ts: new Date().toISOString(),
    correlationId: params.ctx.correlationId,
    actorId: params.ctx.user?.id ?? null,
    role: params.ctx.user?.role ?? null,
    route: params.procedure,
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
