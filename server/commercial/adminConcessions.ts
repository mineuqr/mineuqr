/**
 * COMMERCIAL-ADMIN-FREE-PERIOD-IMPLEMENTATION-1
 * Admin concession grant/revise/cancel on an existing owner subscription.
 */
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";
import { getOwnerAccountSubscriptionRow } from "./ownerAccountSubscriptionAuthority";
import { loadCurrentChargedTermsSnapshot } from "./chargedTermsSnapshots";
import {
  cancelCommercialConcession,
  grantCommercialConcession,
  loadCurrentCommercialConcession,
  rethrowConcessionAsTrpc,
  reviseCommercialConcession,
  type CommercialConcessionRow,
} from "./concessions";
import {
  assertProtectedUserSubscriptionModifiable,
  ProtectedUserModifyError,
} from "../db/cascadeDeletes";

const PROTECTED_MESSAGE = "لا يمكن تعديل اشتراك هذا المستخدم المحمي";

async function loadModifiableOwnerSubscription(userId: number) {
  try {
    await assertProtectedUserSubscriptionModifiable(userId);
  } catch (error) {
    if (error instanceof ProtectedUserModifyError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: PROTECTED_MESSAGE });
    }
    throw error;
  }
  const existing = await getOwnerAccountSubscriptionRow(userId);
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "لا يوجد اشتراك حساب لهذا المستخدم" });
  }
  if (existing.status === "canceled" || existing.status === "expired") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_status" });
  }
  if (existing.status === "trial") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "trial_conflict" });
  }
  return existing;
}

export async function applyAdminConcessionGrant(params: {
  ctx: TrpcContext;
  userId: number;
  unit: string;
  duration: number;
  reason: string;
}): Promise<CommercialConcessionRow> {
  const existing = await loadModifiableOwnerSubscription(params.userId);
  try {
    return await grantCommercialConcession({
      subscriptionId: existing.id,
      planId: String(existing.planId),
      billingCycleCode: existing.billingCycle,
      unit: params.unit,
      duration: params.duration,
      reason: params.reason,
      actorId: params.ctx.user?.id ?? null,
    });
  } catch (error) {
    rethrowConcessionAsTrpc(error);
  }
}

export async function applyAdminConcessionRevise(params: {
  ctx: TrpcContext;
  userId: number;
  unit: string;
  duration: number;
  reason: string;
}): Promise<CommercialConcessionRow> {
  const existing = await loadModifiableOwnerSubscription(params.userId);
  try {
    return await reviseCommercialConcession({
      subscriptionId: existing.id,
      unit: params.unit,
      duration: params.duration,
      reason: params.reason,
      actorId: params.ctx.user?.id ?? null,
    });
  } catch (error) {
    rethrowConcessionAsTrpc(error);
  }
}

export async function applyAdminConcessionCancel(params: {
  ctx: TrpcContext;
  userId: number;
  reason: string;
}): Promise<CommercialConcessionRow | null> {
  const existing = await loadModifiableOwnerSubscription(params.userId);
  const snapshot = await loadCurrentChargedTermsSnapshot(existing.id);
  try {
    return await cancelCommercialConcession({
      subscriptionId: existing.id,
      reason: params.reason,
      actorId: params.ctx.user?.id ?? null,
      expirePeriodIfUnpaid: snapshot == null,
    });
  } catch (error) {
    rethrowConcessionAsTrpc(error);
  }
}

export async function applyAdminConcessionRead(params: {
  userId: number;
}): Promise<CommercialConcessionRow | null> {
  const existing = await getOwnerAccountSubscriptionRow(params.userId);
  if (!existing) return null;
  return loadCurrentCommercialConcession(existing.id);
}
