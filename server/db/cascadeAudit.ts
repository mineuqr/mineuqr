import type { Request } from "express";
import { getClientIp } from "../_core/rateLimit";
import type { TrpcContext } from "../_core/context";
import type { CascadeAuditContext } from "./cascadeDeletes";

export function cascadeAuditFromTrpc(
  ctx: TrpcContext,
  procedure: string,
  action: string
): CascadeAuditContext {
  return {
    actorId: ctx.user?.id ?? null,
    role: ctx.user?.role ?? null,
    correlationId: ctx.correlationId,
    procedure,
    action,
    ip: getClientIp(ctx.req as Request),
  };
}
