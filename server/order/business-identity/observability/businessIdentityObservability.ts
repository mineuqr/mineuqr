import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import type { BusinessIdentityInfrastructureErrorKind } from "../infrastructure/mysqlInfrastructureErrors";

export type BusinessIdentityLogContext = {
  restaurantId?: number;
  orderId?: number;
  businessDay?: string;
  dailyDisplayNumber?: number;
  attempt?: number;
  durationMs?: number;
  correlationId?: string;
  workerId?: string;
  path?: "hot" | "historic";
  errorKind?: BusinessIdentityInfrastructureErrorKind;
  error?: string;
};

function baseMetadata(ctx: BusinessIdentityLogContext): Record<string, unknown> {
  return {
    orderId: ctx.orderId,
    businessDay: ctx.businessDay,
    dailyDisplayNumber: ctx.dailyDisplayNumber,
    attempt: ctx.attempt,
    durationMs: ctx.durationMs,
    workerId: ctx.workerId,
    path: ctx.path,
  };
}

export function logBusinessIdentityAssignmentStarted(ctx: BusinessIdentityLogContext): void {
  opsLog({
    type: OPS_EVENT.business_identity_assignment_started,
    category: "ORDER",
    severity: "debug",
    ts: new Date().toISOString(),
    restaurantId: ctx.restaurantId ?? null,
    correlationId: ctx.correlationId,
    metadata: baseMetadata(ctx),
  });
}

export function logBusinessIdentityAssignmentCompleted(ctx: BusinessIdentityLogContext): void {
  opsLog({
    type: OPS_EVENT.business_identity_assignment_completed,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: ctx.restaurantId ?? null,
    correlationId: ctx.correlationId,
    metadata: baseMetadata(ctx),
  });
}

export function logBusinessIdentityAssignmentRetry(ctx: BusinessIdentityLogContext): void {
  opsLog({
    type: OPS_EVENT.business_identity_assignment_retry,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: ctx.restaurantId ?? null,
    correlationId: ctx.correlationId,
    metadata: {
      ...baseMetadata(ctx),
      errorKind: ctx.errorKind,
      error: ctx.error,
    },
  });
}

export function logBusinessIdentityDeadlock(ctx: BusinessIdentityLogContext): void {
  opsLog({
    type: OPS_EVENT.business_identity_deadlock,
    category: "ORDER",
    severity: "warn",
    ts: new Date().toISOString(),
    restaurantId: ctx.restaurantId ?? null,
    correlationId: ctx.correlationId,
    metadata: {
      ...baseMetadata(ctx),
      error: ctx.error,
    },
  });
}

export function logBusinessIdentityUniqueConstraintRetry(ctx: BusinessIdentityLogContext): void {
  opsLog({
    type: OPS_EVENT.business_identity_unique_constraint_retry,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: ctx.restaurantId ?? null,
    correlationId: ctx.correlationId,
    metadata: {
      ...baseMetadata(ctx),
      error: ctx.error,
    },
  });
}

export function logBusinessIdentityFailed(ctx: BusinessIdentityLogContext): void {
  opsLog({
    type: OPS_EVENT.business_identity_failed,
    category: "ORDER",
    severity: "error",
    ts: new Date().toISOString(),
    restaurantId: ctx.restaurantId ?? null,
    correlationId: ctx.correlationId,
    metadata: {
      ...baseMetadata(ctx),
      errorKind: ctx.errorKind,
      error: ctx.error,
    },
  });
}
