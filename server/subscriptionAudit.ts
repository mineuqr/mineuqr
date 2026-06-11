/**
 * ADMIN-SECURITY-CENTER PR-3 — subscription create/update audit (opsLog only).
 */
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import { opsLog } from "./_core/opsLog";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import {
  buildAdminSubscriptionInsert,
  applyAdminTrialStatusUpdate,
  computeAdminSubscriptionPeriodEnd,
} from "./adminSubscriptionHelpers";
import {
  getOwnerAccountSubscriptionRow,
  ownerHasEntitledAccountSubscription,
} from "./commercial/ownerAccountSubscriptionAuthority";
import {
  createSubscriptionForRestaurant,
  updateSubscriptionById,
} from "./db";
import {
  assertProtectedUserSubscriptionModifiable,
  ProtectedUserModifyError,
} from "./db/cascadeDeletes";
import {
  projectSubscriptionAuditSnapshot,
  subscriptionAuditSnapshotFromInsert,
  subscriptionAuditSnapshotFromRow,
  subscriptionAuditSnapshotsEqual,
  type SubscriptionAuditSnapshot,
  type SubscriptionAuditStatus,
} from "./subscriptionAuditSnapshot";

type BillingCycle = "monthly" | "yearly";

const PROTECTED_CREATE_MESSAGE = "لا يمكن إنشاء اشتراك لهذا المستخدم المحمي";
const PROTECTED_UPDATE_MESSAGE = "لا يمكن تعديل اشتراك هذا المستخدم المحمي";

export function logSubscriptionCreatedByAdmin(params: {
  ctx: TrpcContext;
  procedure: string;
  targetUserId: number;
  subscriptionId: number;
  snapshot: SubscriptionAuditSnapshot;
}): void {
  opsLog({
    type: OPS_EVENT.subscription_created_by_admin,
    category: "ADMIN",
    severity: "info",
    ts: new Date().toISOString(),
    correlationId: params.ctx.correlationId,
    actorId: params.ctx.user?.id ?? null,
    role: params.ctx.user?.role ?? null,
    route: params.procedure,
    metadata: {
      actorUserId: params.ctx.user?.id ?? null,
      actorRole: params.ctx.user?.role ?? null,
      targetUserId: params.targetUserId,
      subscriptionId: params.subscriptionId,
      plan: params.snapshot.plan,
      status: params.snapshot.status,
      startDate: params.snapshot.startDate,
      endDate: params.snapshot.expiration,
      procedure: params.procedure,
    },
  });
}

export function logSubscriptionUpdatedByAdmin(params: {
  ctx: TrpcContext;
  procedure: string;
  targetUserId: number;
  subscriptionId: number;
  before: SubscriptionAuditSnapshot;
  after: SubscriptionAuditSnapshot;
}): void {
  opsLog({
    type: OPS_EVENT.subscription_updated_by_admin,
    category: "ADMIN",
    severity: "info",
    ts: new Date().toISOString(),
    correlationId: params.ctx.correlationId,
    actorId: params.ctx.user?.id ?? null,
    role: params.ctx.user?.role ?? null,
    route: params.procedure,
    metadata: {
      actorUserId: params.ctx.user?.id ?? null,
      actorRole: params.ctx.user?.role ?? null,
      targetUserId: params.targetUserId,
      subscriptionId: params.subscriptionId,
      before: {
        plan: params.before.plan,
        status: params.before.status,
        expiration: params.before.expiration,
      },
      after: {
        plan: params.after.plan,
        status: params.after.status,
        expiration: params.after.expiration,
      },
      procedure: params.procedure,
    },
  });
}

export async function applyAdminUserSubscriptionCreate(params: {
  ctx: TrpcContext;
  procedure: string;
  userId: number;
  restaurantId?: number;
  planId: number;
  billingCycle: BillingCycle;
  subscriptionEndDate?: string;
  status?: SubscriptionAuditStatus;
}) {
  const { ctx, procedure, userId, planId, billingCycle, subscriptionEndDate, status } = params;

  try {
    await assertProtectedUserSubscriptionModifiable(userId);
  } catch (error) {
    if (error instanceof ProtectedUserModifyError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: PROTECTED_CREATE_MESSAGE });
    }
    throw error;
  }

  if (params.restaurantId !== undefined && params.restaurantId !== 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Account subscriptions must use restaurantId 0. Manage subscriptions at owner level only.",
    });
  }

  if (await ownerHasEntitledAccountSubscription(userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "المستخدم لديه اشتراك بالفعل. استخدم التعديل بدلاً من الإنشاء.",
    });
  }

  const subscriptionStatus = status || "active";
  const now = new Date();
  const insert = buildAdminSubscriptionInsert(
    {
      userId,
      restaurantId: 0,
      planId,
      status: subscriptionStatus,
      billingCycle,
      subscriptionEndDate,
    },
    now
  );
  const result = await createSubscriptionForRestaurant(insert);
  const snapshot = subscriptionAuditSnapshotFromInsert({
    planId: insert.planId,
    status: subscriptionStatus,
    currentPeriodStart: insert.currentPeriodStart,
    currentPeriodEnd: insert.currentPeriodEnd,
  });

  logSubscriptionCreatedByAdmin({
    ctx,
    procedure,
    targetUserId: userId,
    subscriptionId: result.id,
    snapshot,
  });

  const periodEnd = computeAdminSubscriptionPeriodEnd({
    billingCycle,
    subscriptionEndDate,
    status: subscriptionStatus,
  });

  return {
    success: true as const,
    subscriptionId: result.id,
    periodEnd,
    subscriptionStatus,
  };
}

function buildAdminSubscriptionUpdateData(input: {
  planId?: number;
  billingCycle?: BillingCycle;
  status?: SubscriptionAuditStatus;
  subscriptionEndDate?: string;
}): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (input.planId !== undefined) updateData.planId = input.planId;
  if (input.billingCycle !== undefined) updateData.billingCycle = input.billingCycle;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.subscriptionEndDate) {
    updateData.currentPeriodEnd = new Date(input.subscriptionEndDate).toISOString();
  }
  applyAdminTrialStatusUpdate(updateData, input);
  return updateData;
}

export async function applyAdminUserSubscriptionUpdate(params: {
  ctx: TrpcContext;
  procedure: string;
  userId: number;
  planId?: number;
  billingCycle?: BillingCycle;
  status?: SubscriptionAuditStatus;
  subscriptionEndDate?: string;
}) {
  const { ctx, procedure, userId, ...input } = params;

  try {
    await assertProtectedUserSubscriptionModifiable(userId);
  } catch (error) {
    if (error instanceof ProtectedUserModifyError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: PROTECTED_UPDATE_MESSAGE });
    }
    throw error;
  }

  const existing = await getOwnerAccountSubscriptionRow(userId);
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد اشتراك حساب لهذا المستخدم" });
  }

  const updateData = buildAdminSubscriptionUpdateData(input);
  if (Object.keys(updateData).length === 0) {
    return { success: true as const, changed: false, subscriptionId: existing.id };
  }

  const before = subscriptionAuditSnapshotFromRow(existing);
  const after = projectSubscriptionAuditSnapshot(existing, updateData);

  if (subscriptionAuditSnapshotsEqual(before, after)) {
    return { success: true as const, changed: false, subscriptionId: existing.id };
  }

  await updateSubscriptionById(existing.id, updateData);

  logSubscriptionUpdatedByAdmin({
    ctx,
    procedure,
    targetUserId: userId,
    subscriptionId: existing.id,
    before,
    after,
  });

  return { success: true as const, changed: true, subscriptionId: existing.id };
}
