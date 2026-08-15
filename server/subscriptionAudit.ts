/**
 * ADMIN-SECURITY-CENTER PR-3 — subscription create/update audit (opsLog only).
 */
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import { emitAuditEvent } from "./audit/auditEmitter";
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
  classifyPlanTransitionEvent,
  ensureLivePlanBoundForSubscription,
} from "./services/commercial-catalog";
import { cascadeAuditFromTrpc } from "./db/cascadeAudit";
import {
  assertProtectedUserSubscriptionModifiable,
  deleteSubscriptionCascade,
  ProtectedUserModifyError,
} from "./db/cascadeDeletes";
import {
  projectSubscriptionAuditSnapshot,
  subscriptionAuditSnapshotFromInsert,
  subscriptionAuditSnapshotFromRow,
  subscriptionAuditSnapshotToChangeFields,
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
  emitAuditEvent({
    eventType: OPS_EVENT.subscription_created_by_admin,
    category: "SUBSCRIPTION",
    severity: "info",
    opsCategory: "ADMIN",
    correlationId: params.ctx.correlationId,
    actorId: params.ctx.user?.id ?? null,
    actorRole: params.ctx.user?.role ?? null,
    targetType: "subscription",
    targetId: params.subscriptionId,
    procedure: params.procedure,
    opsRoute: params.procedure,
    after: {
      plan: params.snapshot.plan,
      status: params.snapshot.status,
      startDate: params.snapshot.startDate,
      expiration: params.snapshot.expiration,
    },
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
  const beforeFields = subscriptionAuditSnapshotToChangeFields(params.before);
  const afterFields = subscriptionAuditSnapshotToChangeFields(params.after);

  emitAuditEvent({
    eventType: OPS_EVENT.subscription_updated_by_admin,
    category: "SUBSCRIPTION",
    severity: "info",
    opsCategory: "ADMIN",
    correlationId: params.ctx.correlationId,
    actorId: params.ctx.user?.id ?? null,
    actorRole: params.ctx.user?.role ?? null,
    targetType: "subscription",
    targetId: params.subscriptionId,
    procedure: params.procedure,
    opsRoute: params.procedure,
    before: beforeFields,
    after: afterFields,
    metadata: {
      actorUserId: params.ctx.user?.id ?? null,
      actorRole: params.ctx.user?.role ?? null,
      targetUserId: params.targetUserId,
      subscriptionId: params.subscriptionId,
      before: beforeFields,
      after: afterFields,
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
  const { resolveCanonicalLivePlanId } = await import("./services/commercial-catalog");
  const livePlanId = await resolveCanonicalLivePlanId(planId);
  const insert = buildAdminSubscriptionInsert(
    {
      userId,
      restaurantId: 0,
      planId: livePlanId,
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

  await ensureLivePlanBoundForSubscription({
    subscriptionId: result.id,
    legacyPlanId: planId,
    event: "plan_selected",
    actorId: ctx.user?.id ?? null,
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
  if (typeof updateData.planId === "number") {
    const { resolveCanonicalLivePlanId } = await import("./services/commercial-catalog");
    updateData.planId = await resolveCanonicalLivePlanId(updateData.planId);
  }
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

  const nextPlanId =
    typeof updateData.planId === "string" || typeof updateData.planId === "number"
      ? updateData.planId
      : existing.planId;
  const planChanged =
    (typeof updateData.planId === "string" || typeof updateData.planId === "number") &&
    updateData.planId !== existing.planId;
  const periodChanged =
    typeof updateData.currentPeriodEnd === "string" &&
    updateData.currentPeriodEnd !== existing.currentPeriodEnd;
  const statusActivated =
    updateData.status === "active" && existing.status !== "active";

  if (planChanged || periodChanged || statusActivated) {
    const event = planChanged
      ? classifyPlanTransitionEvent(existing.planId, nextPlanId)
      : periodChanged
        ? "renewal"
        : "plan_selected";
    const { resolveLegacyPlanIdFromPlan } = await import("./services/commercial-catalog");
    const legacyForBind =
      input.planId ??
      (typeof nextPlanId === "number" ? nextPlanId : resolveLegacyPlanIdFromPlan(String(nextPlanId)));
    if (legacyForBind != null) {
      await ensureLivePlanBoundForSubscription({
        subscriptionId: existing.id,
        legacyPlanId: legacyForBind,
        event,
        actorId: ctx.user?.id ?? null,
      });
    }
  }

  return { success: true as const, changed: true, subscriptionId: existing.id };
}

const PROTECTED_DELETE_MESSAGE = "لا يمكن حذف اشتراك هذا المستخدم المحمي";

export async function applyAdminUserSubscriptionDelete(params: {
  ctx: TrpcContext;
  procedure: string;
  userId: number;
}) {
  const { ctx, procedure, userId } = params;

  try {
    await assertProtectedUserSubscriptionModifiable(userId);
  } catch (error) {
    if (error instanceof ProtectedUserModifyError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: PROTECTED_DELETE_MESSAGE });
    }
    throw error;
  }

  const existing = await getOwnerAccountSubscriptionRow(userId);
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد اشتراك حساب لهذا المستخدم" });
  }

  const before = subscriptionAuditSnapshotToChangeFields(
    subscriptionAuditSnapshotFromRow(existing)
  );

  await deleteSubscriptionCascade(existing.id, {
    ...cascadeAuditFromTrpc(ctx, procedure, "delete_subscription"),
    subscriptionBefore: before,
  });

  return { success: true as const, subscriptionId: existing.id };
}
