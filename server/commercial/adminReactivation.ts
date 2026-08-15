/**
 * COMMERCIAL-ADMIN-REACTIVATION-IMPLEMENTATION-1
 * Dedicated Admin Reactivation: new commercial commitment on the existing account row.
 * Model B — paid inserts Snapshot N+1. Free inserts a new concession. No Model A reuse.
 */
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import { emitAuditEvent } from "../audit/auditEmitter";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { computeAdminSubscriptionPeriodEnd } from "../adminSubscriptionHelpers";
import {
  getOwnerAccountSubscriptionRow,
} from "./ownerAccountSubscriptionAuthority";
import {
  assertProtectedUserSubscriptionModifiable,
  ProtectedUserModifyError,
} from "../db/cascadeDeletes";
import { subscriptionEntitledNow } from "../subscriptionResolver";
import {
  resolveChargedTermsForAdminCreate,
  rethrowAdminChargedTermsAsTrpc,
  throwAdminFinancialIncomplete,
} from "./adminChargedTermsCompletion";
import {
  applyAdminPaidReactivation,
  chargedTermsSnapshotMatchesOffer,
  loadCurrentChargedTermsSnapshot,
  type ChargedTermsSnapshotRow,
} from "./chargedTermsSnapshots";
import {
  applyAdminFreeReactivation,
  loadCurrentCommercialConcession,
  rethrowConcessionAsTrpc,
  type CommercialConcessionRow,
} from "./concessions";

const PROTECTED_MESSAGE = "لا يمكن تعديل اشتراك هذا المستخدم المحمي";
const USE_REACTIVATE_MESSAGE = "use_reactivate";
const PERIOD_NOT_FUTURE_MESSAGE = "period_not_future";
const ALREADY_ENTITLED_MESSAGE = "already_entitled_use_update";

export type AdminReactivationMode = "paid" | "free";

export type AdminFreeReactivationInput = {
  unit: "day" | "month";
  duration: number;
};

function normalizeReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 512) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_reason" });
  }
  return trimmed;
}

function emitReactivated(params: {
  ctx: TrpcContext;
  subscriptionId: number;
  previousStatus: string;
  planId: string;
  billingCycle: string;
  oldSnapshotId: string | null;
  newSnapshotId: string | null;
  effectiveFrom: string;
  reason: string;
  mode: AdminReactivationMode;
}): void {
  try {
    emitAuditEvent({
      eventType: OPS_EVENT.commercial_subscription_reactivated,
      category: "COMMERCIAL",
      severity: "info",
      opsCategory: "ADMIN",
      correlationId: params.ctx.correlationId,
      actorId: params.ctx.user?.id ?? null,
      actorRole: params.ctx.user?.role ?? null,
      targetType: "subscription",
      targetId: params.subscriptionId,
      procedure: "admin.reactivateUserSubscriptionByAdmin",
      opsRoute: "admin.reactivateUserSubscriptionByAdmin",
      before: { status: params.previousStatus },
      after: { status: "active", planId: params.planId },
      metadata: {
        actorId: params.ctx.user?.id ?? null,
        actorRole: params.ctx.user?.role ?? null,
        subscriptionId: params.subscriptionId,
        previousStatus: params.previousStatus,
        newStatus: "active",
        planId: params.planId,
        billingCycle: params.billingCycle,
        oldSnapshotId: params.oldSnapshotId,
        newSnapshotId: params.newSnapshotId,
        effectiveFrom: params.effectiveFrom,
        reason: params.reason,
        mode: params.mode,
      },
    });
  } catch {
    /* audit must not reverse persist */
  }
}

export async function applyAdminUserSubscriptionReactivate(params: {
  ctx: TrpcContext;
  userId: number;
  planId: string;
  billingCycle: "monthly" | "yearly";
  reason: string;
  mode: AdminReactivationMode;
  subscriptionEndDate?: string;
  freePeriod?: AdminFreeReactivationInput;
}): Promise<{
  success: true;
  changed: boolean;
  subscriptionId: number;
  mode: AdminReactivationMode;
  snapshotId: string | null;
  concessionId: string | null;
}> {
  const reason = normalizeReason(params.reason);
  const now = new Date();

  try {
    await assertProtectedUserSubscriptionModifiable(params.userId);
  } catch (error) {
    if (error instanceof ProtectedUserModifyError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: PROTECTED_MESSAGE });
    }
    throw error;
  }

  const existing = await getOwnerAccountSubscriptionRow(params.userId, now);
  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "لا يوجد اشتراك حساب لهذا المستخدم",
    });
  }

  const { resolveLivePlanById } = await import("../services/commercial-catalog");
  let livePlanId: string;
  try {
    livePlanId = await resolveLivePlanById(params.planId);
  } catch {
    throwAdminFinancialIncomplete();
  }

  const entitled = subscriptionEntitledNow(existing, now);
  const currentSnapshot = await loadCurrentChargedTermsSnapshot(existing.id);
  const currentConcession = await loadCurrentCommercialConcession(existing.id, now);

  if (params.mode === "free") {
    const freePeriod = params.freePeriod;
    if (!freePeriod) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "free_period_required" });
    }
    if (entitled && currentConcession) {
      if (
        currentConcession.unit === freePeriod.unit &&
        currentConcession.duration === freePeriod.duration &&
        String(existing.planId) === livePlanId &&
        existing.billingCycle === params.billingCycle
      ) {
        return {
          success: true,
          changed: false,
          subscriptionId: existing.id,
          mode: "free",
          snapshotId: null,
          concessionId: currentConcession.id,
        };
      }
      if (entitled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: ALREADY_ENTITLED_MESSAGE });
      }
    }
    if (entitled) {
      throw new TRPCError({ code: "BAD_REQUEST", message: ALREADY_ENTITLED_MESSAGE });
    }

    let concession: CommercialConcessionRow;
    try {
      concession = await applyAdminFreeReactivation({
        subscriptionId: existing.id,
        planId: livePlanId,
        billingCycleCode: params.billingCycle,
        unit: freePeriod.unit,
        duration: freePeriod.duration,
        reason,
        actorId: params.ctx.user?.id ?? null,
        subscriptionUpdate: {
          planId: livePlanId,
          billingCycle: params.billingCycle,
          status: "active",
          currentPeriodStart: now.toISOString(),
        },
      });
    } catch (error) {
      rethrowConcessionAsTrpc(error);
    }

    emitReactivated({
      ctx: params.ctx,
      subscriptionId: existing.id,
      previousStatus: existing.status,
      planId: livePlanId,
      billingCycle: params.billingCycle,
      oldSnapshotId: currentSnapshot?.id ?? null,
      newSnapshotId: null,
      effectiveFrom: concession.startsAt,
      reason,
      mode: "free",
    });

    return {
      success: true,
      changed: true,
      subscriptionId: existing.id,
      mode: "free",
      snapshotId: null,
      concessionId: concession.id,
    };
  }

  let offer;
  try {
    offer = await resolveChargedTermsForAdminCreate({
      planId: livePlanId,
      billingCycleCode: params.billingCycle,
    });
  } catch (error) {
    rethrowAdminChargedTermsAsTrpc(error);
  }

  if (entitled) {
    if (
      currentSnapshot &&
      chargedTermsSnapshotMatchesOffer(currentSnapshot, offer) &&
      String(existing.planId) === offer.planId &&
      existing.billingCycle === params.billingCycle
    ) {
      return {
        success: true,
        changed: false,
        subscriptionId: existing.id,
        mode: "paid",
        snapshotId: currentSnapshot.id,
        concessionId: null,
      };
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: ALREADY_ENTITLED_MESSAGE });
  }

  const periodEnd = computeAdminSubscriptionPeriodEnd({
    billingCycle: params.billingCycle,
    subscriptionEndDate: params.subscriptionEndDate,
    status: "active",
  });
  if (!(periodEnd.getTime() > now.getTime())) {
    throw new TRPCError({ code: "BAD_REQUEST", message: PERIOD_NOT_FUTURE_MESSAGE });
  }

  let snapshot: ChargedTermsSnapshotRow;
  try {
    snapshot = await applyAdminPaidReactivation({
      subscriptionId: existing.id,
      offer,
      actorId: params.ctx.user?.id ?? null,
      subscriptionUpdate: {
        planId: offer.planId,
        billingCycle: params.billingCycle,
        status: "active",
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
      },
    });
  } catch {
    throwAdminFinancialIncomplete();
  }

  emitReactivated({
    ctx: params.ctx,
    subscriptionId: existing.id,
    previousStatus: existing.status,
    planId: offer.planId,
    billingCycle: params.billingCycle,
    oldSnapshotId: currentSnapshot?.id ?? null,
    newSnapshotId: snapshot.id,
    effectiveFrom: snapshot.effectiveFrom,
    reason,
    mode: "paid",
  });

  return {
    success: true,
    changed: true,
    subscriptionId: existing.id,
    mode: "paid",
    snapshotId: snapshot.id,
    concessionId: null,
  };
}

export function assertUpdateDoesNotImplicitlyReactivate(
  existing: {
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  },
  projected: {
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  },
  now: Date = new Date()
): void {
  const activating =
    (existing.status === "canceled" || existing.status === "expired") &&
    (projected.status === "active" || projected.status === "trial");
  if (activating) {
    throw new TRPCError({ code: "BAD_REQUEST", message: USE_REACTIVATE_MESSAGE });
  }
  const before = subscriptionEntitledNow(existing as never, now);
  const after = subscriptionEntitledNow(projected as never, now);
  if (!before && after) {
    throw new TRPCError({ code: "BAD_REQUEST", message: USE_REACTIVATE_MESSAGE });
  }
}
