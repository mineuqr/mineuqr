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
import { getOwnerAccountSubscriptionRow } from "./commercial/ownerAccountSubscriptionAuthority";
import { assertUpdateDoesNotImplicitlyReactivate } from "./commercial/adminReactivation";
import {
  createSubscriptionForRestaurant,
  deleteUserSubscriptionById,
  updateSubscriptionById,
} from "./db";
import {
  persistAdminCreateChargedTerms,
  resolveChargedTermsForAdminCreate,
  rethrowAdminChargedTermsAsTrpc,
  throwAdminFinancialIncomplete,
} from "./commercial/adminChargedTermsCompletion";
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

export type AdminFreePeriodInput = {
  unit: "day" | "month";
  duration: number;
  reason: string;
};

export async function applyAdminUserSubscriptionCreate(params: {
  ctx: TrpcContext;
  procedure: string;
  userId: number;
  restaurantId?: number;
  planId: string;
  billingCycle: BillingCycle;
  subscriptionEndDate?: string;
  status?: SubscriptionAuditStatus;
  freePeriod?: AdminFreePeriodInput;
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

  if (await getOwnerAccountSubscriptionRow(userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "المستخدم لديه اشتراك حساب. استخدم التعديل أو إعادة التفعيل بدلاً من الإنشاء.",
    });
  }

  const freePeriod = params.freePeriod;
  if (freePeriod) {
    if (status && status !== "active") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "trial_conflict" });
    }
    if (subscriptionEndDate) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "conflicting_period_end" });
    }
  }

  const subscriptionStatus = freePeriod ? "active" : status || "active";
  const now = new Date();
  const { resolveLivePlanById } = await import("./services/commercial-catalog");
  let livePlanId: string;
  try {
    livePlanId = await resolveLivePlanById(planId);
  } catch {
    throwAdminFinancialIncomplete();
  }

  let offer;
  try {
    offer = await resolveChargedTermsForAdminCreate({
      planId: livePlanId,
      billingCycleCode: billingCycle,
    });
  } catch (error) {
    rethrowAdminChargedTermsAsTrpc(error);
  }

  let concessionEndsAt: string | undefined;
  if (freePeriod) {
    const { computeConcessionEndsAt } = await import("@shared/commercial-concession");
    concessionEndsAt = computeConcessionEndsAt(
      now,
      freePeriod.unit,
      freePeriod.duration
    ).toISOString();
  }

  const insert = buildAdminSubscriptionInsert(
    {
      userId,
      restaurantId: 0,
      planId: livePlanId,
      status: subscriptionStatus,
      billingCycle,
      subscriptionEndDate: concessionEndsAt ?? subscriptionEndDate,
    },
    now
  );
  const result = await createSubscriptionForRestaurant(insert);

  if (freePeriod) {
    try {
      const { persistAdminFreeFirstConcession } = await import("./commercial/concessions");
      await persistAdminFreeFirstConcession({
        subscriptionId: result.id,
        planId: livePlanId,
        billingCycleCode: billingCycle,
        unit: freePeriod.unit,
        duration: freePeriod.duration,
        reason: freePeriod.reason,
        actorId: ctx.user?.id ?? null,
      });
    } catch (error) {
      try {
        await deleteUserSubscriptionById(result.id);
      } catch {
        /* still fail closed */
      }
      const { rethrowConcessionAsTrpc } = await import("./commercial/concessions");
      rethrowConcessionAsTrpc(error);
    }
  } else {
    try {
      await persistAdminCreateChargedTerms({
        subscriptionId: result.id,
        offer,
        actorId: ctx.user?.id ?? null,
      });
    } catch (error) {
      try {
        await deleteUserSubscriptionById(result.id);
      } catch {
        /* still fail closed; do not return a financially incomplete success */
      }
      rethrowAdminChargedTermsAsTrpc(error);
    }
  }

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
  planId?: string;
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
  planId?: string;
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
  const projected = projectSubscriptionAuditSnapshot(existing, updateData);
  assertUpdateDoesNotImplicitlyReactivate(
    {
      status: existing.status,
      trialEndsAt: existing.trialEndsAt,
      currentPeriodEnd: existing.currentPeriodEnd,
    },
    {
      status: projected.status,
      trialEndsAt:
        typeof updateData.trialEndsAt === "string"
          ? updateData.trialEndsAt
          : existing.trialEndsAt,
      currentPeriodEnd:
        typeof updateData.currentPeriodEnd === "string"
          ? updateData.currentPeriodEnd
          : existing.currentPeriodEnd,
    }
  );
  if (typeof updateData.planId === "string") {
    const { resolveLivePlanById } = await import("./services/commercial-catalog");
    try {
      updateData.planId = await resolveLivePlanById(updateData.planId);
    } catch {
      throwAdminFinancialIncomplete();
    }
  }

  const commercialPlanChanged =
    typeof updateData.planId === "string" && updateData.planId !== existing.planId;
  const commercialCycleChanged =
    typeof updateData.billingCycle === "string" &&
    updateData.billingCycle !== existing.billingCycle;

  if (input.status === "canceled") {
    try {
      const { cancelCommercialConcession } = await import("./commercial/concessions");
      await cancelCommercialConcession({
        subscriptionId: existing.id,
        reason: "subscription_canceled",
        actorId: ctx.user?.id ?? null,
      });
    } catch {
      /* cancel is best-effort when already inactive */
    }
  }

  if (commercialPlanChanged || commercialCycleChanged) {
    const nextPlanId =
      typeof updateData.planId === "string" ? updateData.planId : String(existing.planId);
    const nextCycle =
      typeof updateData.billingCycle === "string"
        ? updateData.billingCycle
        : existing.billingCycle;
    const { loadCurrentCommercialConcession, updateEnrollmentPlanIdOnly } = await import(
      "./commercial/concessions"
    );
    const currentConcession = await loadCurrentCommercialConcession(existing.id);
    if (currentConcession) {
      if (Object.keys(updateData).length === 0) {
        return { success: true as const, changed: false, subscriptionId: existing.id };
      }
      const before = subscriptionAuditSnapshotFromRow(existing);
      const after = projectSubscriptionAuditSnapshot(existing, updateData);
      if (subscriptionAuditSnapshotsEqual(before, after)) {
        return { success: true as const, changed: false, subscriptionId: existing.id };
      }
      await updateSubscriptionById(existing.id, updateData);
      await updateEnrollmentPlanIdOnly(existing.id, nextPlanId);
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

    let offer;
    try {
      offer = await resolveChargedTermsForAdminCreate({
        planId: nextPlanId,
        billingCycleCode: nextCycle,
      });
    } catch (error) {
      rethrowAdminChargedTermsAsTrpc(error);
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true as const, changed: false, subscriptionId: existing.id };
    }

    const before = subscriptionAuditSnapshotFromRow(existing);
    const after = projectSubscriptionAuditSnapshot(existing, updateData);
    if (subscriptionAuditSnapshotsEqual(before, after)) {
      return { success: true as const, changed: false, subscriptionId: existing.id };
    }

    try {
      const { applyAdminCommercialIdentityChange } = await import(
        "./commercial/chargedTermsSnapshots"
      );
      await applyAdminCommercialIdentityChange({
        subscriptionId: existing.id,
        offer,
        subscriptionUpdate: updateData,
        actorId: ctx.user?.id ?? null,
      });
    } catch {
      throwAdminFinancialIncomplete();
    }

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

  try {
    const { cancelCommercialConcession } = await import("./commercial/concessions");
    await cancelCommercialConcession({
      subscriptionId: existing.id,
      reason: "subscription_deleted",
      actorId: ctx.user?.id ?? null,
    });
  } catch {
    /* historical concession remains if already inactive */
  }

  await deleteSubscriptionCascade(existing.id, {
    ...cascadeAuditFromTrpc(ctx, procedure, "delete_subscription"),
    subscriptionBefore: before,
  });

  return { success: true as const, subscriptionId: existing.id };
}
