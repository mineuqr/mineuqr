/**
 * COMMERCIAL-ADMIN-CHARGED-TERMS-COMPLETION-1
 * Fail-closed financial completion for Admin-created subscriptions.
 * Does not change webhook bind fail-soft or canonical MRR.
 */
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { commercialSubscriptionBindings } from "../db/schema/commercial/bindings";
import {
  ensureCatalogReady,
  getSubscriptionCommercialBinding,
  isLivePlanUuid,
  planService,
  pricingService,
  resolveLivePlanById,
} from "../services/commercial-catalog";
import { newCommercialId, nowIso } from "../services/commercial-catalog/CatalogStore";
import { emitAuditEvent } from "../audit/auditEmitter";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import type { CommercialChargedTerms } from "@shared/commercial-catalog";

export const ADMIN_BILLING_CYCLE_CODES = ["monthly", "yearly"] as const;
export type AdminBillingCycleCode = (typeof ADMIN_BILLING_CYCLE_CODES)[number];

export const ADMIN_FINANCIAL_INCOMPLETE_MESSAGE =
  "تعذر إكمال الاشتراك: الشروط المالية غير متوفرة.";

export type AdminChargedTermsFailureCode =
  | "invalid_billing_cycle"
  | "missing_live_plan"
  | "plan_not_selectable"
  | "missing_amount"
  | "missing_currency"
  | "binding_persist_failed"
  | "charged_terms_incomplete"
  | "historical_terms_immutable";

export class AdminChargedTermsCompletionError extends Error {
  readonly code: AdminChargedTermsFailureCode;

  constructor(code: AdminChargedTermsFailureCode) {
    super(code);
    this.name = "AdminChargedTermsCompletionError";
    this.code = code;
  }
}

export type AdminCreateChargedTermsOffer = {
  planId: string;
  catalogPlanCode: string;
  commercialName: string;
  chargedAmount: string;
  chargedCurrency: string;
  billingCycleId: string;
  billingCycleCode: AdminBillingCycleCode;
  intervalCount: number;
  intervalUnit: CommercialChargedTerms["intervalUnit"];
};

export function isAdminBillingCycleCode(
  value: string
): value is AdminBillingCycleCode {
  return value === "monthly" || value === "yearly";
}

export function throwAdminFinancialIncomplete(): never {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: ADMIN_FINANCIAL_INCOMPLETE_MESSAGE,
  });
}

export function rethrowAdminChargedTermsAsTrpc(error: unknown): never {
  if (error instanceof AdminChargedTermsCompletionError) {
    throwAdminFinancialIncomplete();
  }
  if (error instanceof TRPCError) {
    throw error;
  }
  throwAdminFinancialIncomplete();
}

function termsMatchExisting(
  existing: {
    planId: string;
    chargedAmount: string | null;
    chargedCurrency: string | null;
    billingCycleCode: string | null;
  },
  offer: AdminCreateChargedTermsOffer
): boolean {
  return (
    existing.planId === offer.planId &&
    existing.chargedAmount === offer.chargedAmount &&
    existing.chargedCurrency === offer.chargedCurrency &&
    existing.billingCycleCode === offer.billingCycleCode
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  const err = error as { errno?: number; code?: string; message?: string };
  return (
    err.errno === 1062 ||
    err.code === "ER_DUP_ENTRY" ||
    /duplicate/i.test(String(err.message ?? ""))
  );
}

/**
 * Authoritative Charged Terms for a NEW Admin create:
 * current Live Plan Offer List Price for the Admin-selected billing cycle.
 * Does not read subscription_plans. Does not default yearly → monthly.
 */
export async function resolveChargedTermsForAdminCreate(input: {
  planId: string;
  billingCycleCode: string;
}): Promise<AdminCreateChargedTermsOffer> {
  if (!isAdminBillingCycleCode(input.billingCycleCode)) {
    throw new AdminChargedTermsCompletionError("invalid_billing_cycle");
  }

  await ensureCatalogReady();

  const cycle = pricingService
    .listBillingCycles()
    .find((c) => c.code === input.billingCycleCode);
  if (!cycle) {
    throw new AdminChargedTermsCompletionError("invalid_billing_cycle");
  }

  if (!isLivePlanUuid(input.planId)) {
    throw new AdminChargedTermsCompletionError("missing_live_plan");
  }

  let planId: string;
  try {
    planId = await resolveLivePlanById(input.planId);
  } catch {
    throw new AdminChargedTermsCompletionError("missing_live_plan");
  }

  const plan = planService.get(planId);
  if (!plan || plan.isHidden) {
    throw new AdminChargedTermsCompletionError(
      !plan ? "missing_live_plan" : "plan_not_selectable"
    );
  }

  const price = pricingService.currentPriceForPlan(planId, input.billingCycleCode);
  const amount = price?.amount?.trim() ?? "";
  const parsed = Number.parseFloat(amount);
  if (!price || amount === "" || !Number.isFinite(parsed) || parsed <= 0) {
    throw new AdminChargedTermsCompletionError("missing_amount");
  }

  const currency = price.currency?.trim() ?? "";
  if (!currency) {
    throw new AdminChargedTermsCompletionError("missing_currency");
  }

  return {
    planId: plan.id,
    catalogPlanCode: plan.code,
    commercialName: plan.name,
    chargedAmount: amount,
    chargedCurrency: currency,
    billingCycleId: cycle.id,
    billingCycleCode: input.billingCycleCode,
    intervalCount: cycle.intervalCount,
    intervalUnit: cycle.intervalUnit,
  };
}

export async function persistAdminCreateChargedTerms(input: {
  subscriptionId: number;
  offer: AdminCreateChargedTermsOffer;
  actorId?: number | null;
}): Promise<{ planId: string; chargedTerms: CommercialChargedTerms }> {
  const { offer } = input;
  if (
    !offer.chargedAmount?.trim() ||
    !offer.chargedCurrency?.trim() ||
    !isAdminBillingCycleCode(offer.billingCycleCode)
  ) {
    throw new AdminChargedTermsCompletionError("charged_terms_incomplete");
  }

  const existing = await getSubscriptionCommercialBinding(input.subscriptionId);
  if (existing) {
    if (termsMatchExisting(existing, offer)) {
      return {
        planId: offer.planId,
        chargedTerms: chargedTermsFromOffer(offer),
      };
    }
    throw new AdminChargedTermsCompletionError("historical_terms_immutable");
  }

  const db = await getDb();
  if (!db) {
    throw new AdminChargedTermsCompletionError("binding_persist_failed");
  }

  try {
    await db.insert(commercialSubscriptionBindings).values({
      id: newCommercialId(),
      subscriptionId: input.subscriptionId,
      planId: offer.planId,
      chargedAmount: offer.chargedAmount,
      chargedCurrency: offer.chargedCurrency,
      billingCycleId: offer.billingCycleId,
      billingCycleCode: offer.billingCycleCode,
      legacyPlanId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const raced = await getSubscriptionCommercialBinding(input.subscriptionId);
      if (raced && termsMatchExisting(raced, offer)) {
        return {
          planId: offer.planId,
          chargedTerms: chargedTermsFromOffer(offer),
        };
      }
      throw new AdminChargedTermsCompletionError("historical_terms_immutable");
    }
    throw new AdminChargedTermsCompletionError("binding_persist_failed");
  }

  const written = await getSubscriptionCommercialBinding(input.subscriptionId);
  if (
    !written?.chargedAmount ||
    !written.chargedCurrency ||
    written.billingCycleCode !== offer.billingCycleCode ||
    written.planId !== offer.planId
  ) {
    if (written) {
      await db
        .delete(commercialSubscriptionBindings)
        .where(eq(commercialSubscriptionBindings.subscriptionId, input.subscriptionId));
    }
    throw new AdminChargedTermsCompletionError("charged_terms_incomplete");
  }

  try {
    emitAuditEvent({
      eventType: OPS_EVENT.commercial_snapshot_created,
      category: "COMMERCIAL",
      severity: "info",
      opsCategory: "ADMIN",
      actorId: input.actorId ?? null,
      targetType: "subscription",
      targetId: input.subscriptionId,
      after: {
        planId: offer.planId,
        event: "plan_selected",
        chargedAmount: offer.chargedAmount,
        billingCycleCode: offer.billingCycleCode,
      },
      metadata: { event: "plan_selected", source: "admin_create" },
    });
  } catch {
    /* audit must not reverse a persisted financial completion */
  }

  return {
    planId: offer.planId,
    chargedTerms: chargedTermsFromOffer(offer),
  };
}

function chargedTermsFromOffer(
  offer: AdminCreateChargedTermsOffer
): CommercialChargedTerms {
  return {
    planId: offer.planId,
    catalogPlanCode: offer.catalogPlanCode,
    commercialName: offer.commercialName,
    chargedAmount: offer.chargedAmount,
    chargedCurrency: offer.chargedCurrency,
    billingCycleId: offer.billingCycleId,
    billingCycleCode: offer.billingCycleCode,
    intervalCount: offer.intervalCount,
    intervalUnit: offer.intervalUnit,
    periodStart: null,
    periodEnd: null,
  };
}
