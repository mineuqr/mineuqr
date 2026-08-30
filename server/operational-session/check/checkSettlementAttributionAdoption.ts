/**
 * SETTLEMENT-ATTRIBUTION-ADOPTION-1 / REFUND-REGISTER-ADOPTION-1 / CRMP-CF-ATTRIBUTION-1
 * Post-commit Attribution adoption.
 *
 * DRAWER-ATTRIBUTION-RELIABILITY-1 — create failures retry once, then fail-open.
 * Durable CF replay lives in recoverCollectionFactDrawerAttribution.
 * Runs AFTER Check-owned financial TX commits so Attribution never rolls back money.
 * Current Cashier sales attribute after Collection Fact commit (CF identity).
 * Fail-open (ADR-ARCH-030). Never fabricates Register / Financial Shift.
 * Never mutates Settlement Record. Never recalculates Check totals.
 * Never creates Collection Facts or PAID. Register never executes Refund (ADR-ARCH-032).
 */

import {
  buildSettlementAttributedEvent,
  cashCustodyAmountForRefundRecord,
  collectionFactCommitFallsInShiftWindow,
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
import { COLLECTION_FACT_PRODUCTION_PURPOSE } from "@shared/operational-session/payment/collection-fact";
import { isComplimentaryCollectionFact } from "@shared/pos";
import {
  resolveCrmpSaleAttributionAnchor,
  type CrmpProductionFactCandidate,
} from "@shared/operational-session/check/crmpSaleAttributionAnchor";
import { createDrizzleCrmpUnitOfWork } from "../../crmp/DrizzleCrmpRepository";
import { FinancialShiftDomainService } from "../../crmp/FinancialShiftDomainService";
import { listProductionCollectionFactsForRefundAnchor } from "../payment/collection-fact/collectionFactRepository";

export type SettlementAttributionAdoptionBundle = Readonly<{
  attribution: SettlementAttributionAdoptionResult;
  events: readonly SettlementAttributed[];
}>;

export type CollectionFactAttributionInput = Readonly<{
  collectionFactId: string;
  restaurantId: number;
  orderId: number;
  paymentIntentId: string;
  purpose: string;
  amount: string;
  discountAmount: string;
  currencyCode: string;
  tenders: readonly Readonly<{ paymentMethod: string; amount: string }>[];
  checkId: number | null;
  committedAt: string;
  businessDay: string;
  actorId: string | null;
  terminalId: string | null;
  orderingChannel: string;
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

function toCrmpCandidate(
  fact: CollectionFactAttributionInput
): CrmpProductionFactCandidate {
  return {
    collectionFactId: fact.collectionFactId,
    restaurantId: fact.restaurantId,
    orderId: fact.orderId,
    paymentIntentId: fact.paymentIntentId,
    purpose: fact.purpose,
    amount: fact.amount,
    discountAmount: fact.discountAmount,
    currencyCode: fact.currencyCode,
    tenders: fact.tenders,
    checkId: fact.checkId,
    committedAt: fact.committedAt,
    businessDay: fact.businessDay,
    actorId: fact.actorId,
    terminalId: fact.terminalId,
    orderingChannel: String(fact.orderingChannel),
  };
}

function attributionCreateDeps(deps?: {
  shiftService?: FinancialShiftDomainService;
}): FinancialShiftDomainService {
  return (
    deps?.shiftService ??
    new FinancialShiftDomainService(createDrizzleCrmpUnitOfWork())
  );
}

async function persistAttributionAttempt(input: {
  restaurantId: number;
  settlementContext: SettlementContext;
  settlementRecordId: string | null;
  collectionFactId: string | null;
  cashTenderAmount: string;
  at: string;
  shiftService: FinancialShiftDomainService;
}): Promise<SettlementAttributionAdoptionBundle> {
  const registerId = input.settlementContext.registerId!;
  try {
    const result = await input.shiftService.createAttribution({
      restaurantId: input.restaurantId,
      financialShiftId: input.settlementContext.financialShiftId!,
      settlementRecordId: input.settlementRecordId,
      collectionFactId: input.collectionFactId,
      operatorUserId: input.settlementContext.operatorUserId!,
      cashTenderAmount: input.cashTenderAmount,
      at: input.at,
    });

    if (result.attribution.registerId !== registerId) {
      return {
        attribution: failedAttribution({
          gaps: ["register_mismatch"],
          reason: "Attribution register does not match Settlement Context",
          settlementRecordId: input.settlementRecordId,
          collectionFactId: input.collectionFactId,
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
        collectionFactId: result.attribution.collectionFactId,
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
    const message = err instanceof Error ? err.message : "attribution_error";
    return {
      attribution: failedAttribution({
        gaps: ["attribution_create_failed"],
        reason: message,
        settlementRecordId: input.settlementRecordId,
        collectionFactId: input.collectionFactId,
      }),
      events: [],
    };
  }
}

/** One immediate retry of create failures. Still fail-open. Never rolls back CF/PAID. */
async function persistAttribution(input: {
  restaurantId: number;
  settlementContext: SettlementContext;
  settlementRecordId: string | null;
  collectionFactId: string | null;
  cashTenderAmount: string;
  at: string;
  shiftService: FinancialShiftDomainService;
}): Promise<SettlementAttributionAdoptionBundle> {
  const first = await persistAttributionAttempt(input);
  if (
    first.attribution.outcome !== "failed" ||
    !first.attribution.gaps.includes("attribution_create_failed")
  ) {
    return first;
  }
  return persistAttributionAttempt(input);
}

async function adoptCollectionFactAttributionAfterPaid(
  input: {
    restaurantId: number;
    settlementContext: SettlementContext;
    collectionFact: CollectionFactAttributionInput;
    at: string;
  },
  deps?: {
    shiftService?: FinancialShiftDomainService;
  }
): Promise<SettlementAttributionAdoptionBundle> {
  const collectionFactId = input.collectionFact.collectionFactId?.trim() ?? "";
  if (input.collectionFact.restaurantId !== input.restaurantId) {
    return {
      attribution: failedAttribution({
        gaps: ["wrong_restaurant"],
        reason: "Collection Fact restaurant does not match attribution restaurant",
        collectionFactId: collectionFactId || null,
      }),
      events: [],
    };
  }
  if (input.collectionFact.purpose !== COLLECTION_FACT_PRODUCTION_PURPOSE) {
    return {
      attribution: failedAttribution({
        gaps: ["isolated_collection_fact"],
        reason: "Isolated Collection Fact is not a current-sale attribution anchor",
        collectionFactId: collectionFactId || null,
      }),
      events: [],
    };
  }
  if (!collectionFactId) {
    return {
      attribution: failedAttribution({
        gaps: ["missing_collection_fact_id"],
        reason: "Collection Fact id required for CF-native attribution",
      }),
      events: [],
    };
  }

  const outcome = isComplimentaryCollectionFact(input.collectionFact)
    ? "complimentary"
    : "paid";
  const eligibility = isAttributionEligible({
    outcome,
    collectionFactId,
    registerId: input.settlementContext.registerId,
    financialShiftId: input.settlementContext.financialShiftId,
    operatorUserId: input.settlementContext.operatorUserId,
  });
  if (!eligibility.ok) {
    return {
      attribution: skippedAttribution({
        gaps: [...eligibility.gaps, ...input.settlementContext.gaps],
        reason: eligibility.reason,
        collectionFactId,
      }),
      events: [],
    };
  }

  const shiftService = attributionCreateDeps(deps);
  const financialShiftId = input.settlementContext.financialShiftId!;
  const targetShift = await shiftService.get(
    input.restaurantId,
    financialShiftId
  );
  if (!targetShift) {
    return {
      attribution: skippedAttribution({
        gaps: ["financial_shift_unavailable", ...input.settlementContext.gaps],
        reason: "Financial Shift for Collection Fact attribution was not found",
        collectionFactId,
      }),
      events: [],
    };
  }
  const alreadyOnTarget = targetShift.attributions.some(
    (row) => row.collectionFactId === collectionFactId
  );
  if (
    !alreadyOnTarget &&
    !collectionFactCommitFallsInShiftWindow({
      committedAt: input.collectionFact.committedAt,
      openedAt: targetShift.openedAt,
      closedAt: targetShift.closedAt,
    })
  ) {
    return {
      attribution: skippedAttribution({
        gaps: [
          "collection_fact_outside_shift_window",
          ...input.settlementContext.gaps,
        ],
        reason:
          "Collection Fact committedAt is outside the selected Financial Shift lifetime",
        collectionFactId,
      }),
      events: [],
    };
  }

  return persistAttribution({
    restaurantId: input.restaurantId,
    settlementContext: input.settlementContext,
    settlementRecordId: null,
    collectionFactId,
    cashTenderAmount: sumCashTenderAmounts(input.collectionFact.tenders),
    at: input.at,
    shiftService,
  });
}

async function adoptLegacySettlementRecordAttribution(
  input: {
    restaurantId: number;
    outcome: string;
    settlementContext: SettlementContext;
    settlementRecord: SettlementRecord | null;
    settlementLines: readonly SettlementTransactionInput[] | null;
    at: string;
  },
  deps?: {
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
        gaps: [...eligibility.gaps, ...input.settlementContext.gaps],
        reason: eligibility.reason,
        settlementRecordId,
      }),
      events: [],
    };
  }

  return persistAttribution({
    restaurantId: input.restaurantId,
    settlementContext: input.settlementContext,
    settlementRecordId,
    collectionFactId: null,
    cashTenderAmount: cashFromRecordOrLines({
      record: input.settlementRecord,
      settlementLines: input.settlementLines,
    }),
    at: input.at,
    shiftService: attributionCreateDeps(deps),
  });
}

/**
 * Attempt current-sale Attribution after financial commit.
 * Never throws to caller — always returns explicit outcome.
 *
 * CF-backed Cashier sales attribute from Collection Fact (no SR required).
 * Historical SR-only sales keep the legacy SR path.
 * Ambiguous / isolated / wrong-restaurant CF states fail closed.
 */
export async function adoptSettlementAttributionAfterFinalize(
  input: {
    restaurantId: number;
    outcome: string;
    settlementContext: SettlementContext;
    settlementRecord: SettlementRecord | null;
    settlementLines: readonly SettlementTransactionInput[] | null;
    at: string;
    checkId?: number | null;
    orderIds?: readonly number[];
    collectionFact?: CollectionFactAttributionInput | null;
  },
  deps?: {
    /** Test injection — production uses Drizzle CRMP UoW. */
    shiftService?: FinancialShiftDomainService;
    listProductionFacts?: (query: {
      restaurantId: number;
      checkId: number;
      orderIds: readonly number[];
    }) => Promise<CollectionFactAttributionInput[]>;
  }
): Promise<SettlementAttributionAdoptionBundle> {
  if (input.collectionFact) {
    return adoptCollectionFactAttributionAfterPaid(
      {
        restaurantId: input.restaurantId,
        settlementContext: input.settlementContext,
        collectionFact: input.collectionFact,
        at: input.at,
      },
      deps
    );
  }

  if (input.checkId != null && input.checkId > 0) {
    const orderIds = input.orderIds ?? [];
    let facts: CollectionFactAttributionInput[] = [];
    try {
      facts = deps?.listProductionFacts
        ? await deps.listProductionFacts({
            restaurantId: input.restaurantId,
            checkId: input.checkId,
            orderIds,
          })
        : await listProductionCollectionFactsForRefundAnchor({
            restaurantId: input.restaurantId,
            checkId: input.checkId,
            orderIds,
          });
    } catch (err) {
      const message = err instanceof Error ? err.message : "cf_lookup_error";
      return {
        attribution: failedAttribution({
          gaps: ["collection_fact_lookup_failed"],
          reason: message,
          settlementRecordId: input.settlementRecord?.settlementRecordId ?? null,
        }),
        events: [],
      };
    }

    const anchor = resolveCrmpSaleAttributionAnchor({
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      orderIds,
      facts: facts.map(toCrmpCandidate),
    });
    if (anchor.kind === "invalid") {
      return {
        attribution: failedAttribution({
          gaps: ["invalid_collection_fact_anchor"],
          reason: anchor.reason,
        }),
        events: [],
      };
    }
    if (anchor.kind === "ambiguous") {
      return {
        attribution: failedAttribution({
          gaps: ["ambiguous_collection_facts"],
          reason: `Multiple production Collection Facts for check=${input.checkId} — fail closed`,
          collectionFactId: null,
        }),
        events: [],
      };
    }
    if (anchor.kind === "collection_fact") {
      return adoptCollectionFactAttributionAfterPaid(
        {
          restaurantId: input.restaurantId,
          settlementContext: input.settlementContext,
          collectionFact: anchor.fact,
          at: input.at,
        },
        deps
      );
    }
  }

  return adoptLegacySettlementRecordAttribution(input, deps);
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

  const cashTenderAmount = cashCustodyAmountForRefundRecord({
    paymentSnapshot: (input.settlementRecord?.paymentSnapshot ?? []).map(
      (p) => ({
        paymentMethod: String(p.paymentMethod),
        amount: String(p.amount),
      })
    ),
  });

  return persistAttribution({
    restaurantId: input.restaurantId,
    settlementContext: input.settlementContext,
    settlementRecordId,
    collectionFactId: null,
    cashTenderAmount,
    at: input.at,
    shiftService: attributionCreateDeps(deps),
  });
}
