/**
 * SETTLEMENT-ATTRIBUTION-ADOPTION-1 / REFUND-REGISTER-ADOPTION-1
 * Post-commit Attribution adoption.
 *
 * Runs AFTER Check-owned financial TX commits so Attribution never rolls back money.
 * Fail-open (ADR-ARCH-030). Never fabricates Register / Financial Shift.
 * Never mutates Settlement Record. Never recalculates Check totals.
 * Register never executes Refund (ADR-ARCH-032).
 */

import {
  buildSettlementAttributedEvent,
  cashCustodyAmountForRefundRecord,
  failedAttribution,
  isAttributionEligible,
  isRefundAttributionEligible,
  skippedAttribution,
  sumCashTenderAmounts,
  type SettlementAttributed,
  type SettlementAttributionAdoptionResult,
  type SettlementContext,
} from "@shared/crmp";
import type { SettlementRecord } from "@shared/operational-session";
import type { SettlementTransactionInput } from "@shared/operational-session";
import { createDrizzleCrmpUnitOfWork } from "../../crmp/DrizzleCrmpRepository";
import { FinancialShiftDomainService } from "../../crmp/FinancialShiftDomainService";

export type SettlementAttributionAdoptionBundle = Readonly<{
  attribution: SettlementAttributionAdoptionResult;
  events: readonly SettlementAttributed[];
}>;

function cashFromRecordOrLines(input: {
  record: SettlementRecord | null;
  settlementLines: readonly SettlementTransactionInput[] | null;
}): string {
  if (input.record?.paymentSnapshot?.length) {
    return sumCashTenderAmounts(
      input.record.paymentSnapshot.map((p) => ({
        paymentMethod: String(p.paymentMethod),
        amount: String(p.amount),
      }))
    );
  }
  if (input.settlementLines?.length) {
    return sumCashTenderAmounts(
      input.settlementLines.map((l) => ({
        paymentMethod: String(l.paymentMethod),
        amount: String(l.amount),
      }))
    );
  }
  return "0.00";
}

/**
 * Attempt Settlement Attribution using resolved context + published SR.
 * Never throws to caller — always returns explicit outcome.
 */
export async function adoptSettlementAttributionAfterFinalize(
  input: {
    restaurantId: number;
    outcome: string;
    settlementContext: SettlementContext;
    settlementRecord: SettlementRecord | null;
    settlementLines: readonly SettlementTransactionInput[] | null;
    at: string;
  },
  deps?: {
    /** Test injection — production uses Drizzle CRMP UoW. */
    shiftService?: FinancialShiftDomainService;
  }
): Promise<SettlementAttributionAdoptionBundle> {
  const settlementRecordId = input.settlementRecord?.settlementRecordId ?? null;
  const eligibility = isAttributionEligible({
    outcome: input.outcome,
    settlementRecordId,
    registerId: input.settlementContext.registerId,
    financialShiftId: input.settlementContext.financialShiftId,
    operatorUserId: input.settlementContext.operatorUserId,
  });

  if (!eligibility.ok) {
    return {
      attribution: skippedAttribution({
        gaps: [
          ...eligibility.gaps,
          ...input.settlementContext.gaps,
        ],
        reason: eligibility.reason,
        settlementRecordId,
      }),
      events: [],
    };
  }

  const registerId = input.settlementContext.registerId!;
  const financialShiftId = input.settlementContext.financialShiftId!;
  const operatorUserId = input.settlementContext.operatorUserId!;
  const cashTenderAmount = cashFromRecordOrLines({
    record: input.settlementRecord,
    settlementLines: input.settlementLines,
  });

  try {
    const shifts =
      deps?.shiftService ??
      new FinancialShiftDomainService(createDrizzleCrmpUnitOfWork());
    const result = await shifts.createAttribution({
      restaurantId: input.restaurantId,
      financialShiftId,
      settlementRecordId: settlementRecordId!,
      operatorUserId,
      cashTenderAmount,
      at: input.at,
    });

    // Guard: attribution must reference the same Register as context (no invent/rewrite).
    if (result.attribution.registerId !== registerId) {
      return {
        attribution: failedAttribution({
          gaps: ["register_mismatch"],
          reason: "Attribution register does not match Settlement Context",
          settlementRecordId,
        }),
        events: [],
      };
    }

    const event = buildSettlementAttributedEvent({
      attribution: result.attribution,
      shiftVersion: result.shift.version,
      occurredAt: input.at,
      alreadyApplied: result.alreadyApplied,
    });

    return {
      attribution: {
        outcome: result.alreadyApplied ? "already_applied" : "created",
        attributionId: result.attribution.attributionId,
        settlementRecordId: result.attribution.settlementRecordId,
        registerId: result.attribution.registerId,
        financialShiftId: result.attribution.financialShiftId,
        operatorUserId: result.attribution.operatorUserId,
        cashTenderAmount: result.attribution.cashTenderAmount,
        gaps: [],
        reason: null,
      },
      events: [event],
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "attribution_error";
    return {
      attribution: failedAttribution({
        gaps: ["attribution_create_failed"],
        reason: message,
        settlementRecordId,
      }),
      events: [],
    };
  }
}

/**
 * REFUND-REGISTER-ADOPTION-1 — Attribute a published refund Settlement Record.
 * Post-commit / fail-open. Cash refund → signed negative custody; card → 0.00.
 * Reuses SettlementAttributed (polymorphic by settlementRecordId) — no parallel audit model.
 */
export async function adoptRefundAttributionAfterFinalize(
  input: {
    restaurantId: number;
    settlementContext: SettlementContext;
    settlementRecord: SettlementRecord | null;
    at: string;
  },
  deps?: {
    shiftService?: FinancialShiftDomainService;
  }
): Promise<SettlementAttributionAdoptionBundle> {
  const settlementRecordId = input.settlementRecord?.settlementRecordId ?? null;
  const eligibility = isRefundAttributionEligible({
    recordKind: input.settlementRecord?.recordKind,
    settlementRecordId,
    registerId: input.settlementContext.registerId,
    financialShiftId: input.settlementContext.financialShiftId,
    operatorUserId: input.settlementContext.operatorUserId,
  });

  if (!eligibility.ok) {
    return {
      attribution: skippedAttribution({
        gaps: [...eligibility.gaps, ...input.settlementContext.gaps],
        reason: eligibility.reason,
        settlementRecordId,
      }),
      events: [],
    };
  }

  const registerId = input.settlementContext.registerId!;
  const financialShiftId = input.settlementContext.financialShiftId!;
  const operatorUserId = input.settlementContext.operatorUserId!;
  const cashTenderAmount = cashCustodyAmountForRefundRecord({
    paymentSnapshot: (input.settlementRecord?.paymentSnapshot ?? []).map(
      (p) => ({
        paymentMethod: String(p.paymentMethod),
        amount: String(p.amount),
      })
    ),
  });

  try {
    const shifts =
      deps?.shiftService ??
      new FinancialShiftDomainService(createDrizzleCrmpUnitOfWork());
    const result = await shifts.createAttribution({
      restaurantId: input.restaurantId,
      financialShiftId,
      settlementRecordId: settlementRecordId!,
      operatorUserId,
      cashTenderAmount,
      at: input.at,
    });

    if (result.attribution.registerId !== registerId) {
      return {
        attribution: failedAttribution({
          gaps: ["register_mismatch"],
          reason: "Attribution register does not match Settlement Context",
          settlementRecordId,
        }),
        events: [],
      };
    }

    const event = buildSettlementAttributedEvent({
      attribution: result.attribution,
      shiftVersion: result.shift.version,
      occurredAt: input.at,
      alreadyApplied: result.alreadyApplied,
    });

    return {
      attribution: {
        outcome: result.alreadyApplied ? "already_applied" : "created",
        attributionId: result.attribution.attributionId,
        settlementRecordId: result.attribution.settlementRecordId,
        registerId: result.attribution.registerId,
        financialShiftId: result.attribution.financialShiftId,
        operatorUserId: result.attribution.operatorUserId,
        cashTenderAmount: result.attribution.cashTenderAmount,
        gaps: [],
        reason: null,
      },
      events: [event],
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "attribution_error";
    return {
      attribution: failedAttribution({
        gaps: ["attribution_create_failed"],
        reason: message,
        settlementRecordId,
      }),
      events: [],
    };
  }
}
