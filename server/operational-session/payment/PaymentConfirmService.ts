/**
 * PAYMENT-CONFIRM-SERVICE-1 / PAYMENT-CONFIRM-REMAINING-CALLERS-1 / ADR-ARCH-037
 * PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1
 * Payment process entry for Confirm Payment. Delegates cashier_pos orderId
 * Confirm to Collection Fact + PAID, then optional downstream Check work.
 * checkId Confirm still delegates to certified Check settlement.
 * Not an aggregate. Not a second money SSOT.
 *
 * Caller: Cashier POS Confirm (orderId). Session / QR / Counter cannot Confirm.
 * I-PAY-01 process owner · I-PAY-14 Check may host post-CF document finalize.
 * CheckService may still host finalizeOpenCheckById.
 * ADR-ARCH-038 — cashier_pos may Confirm with orderId (no pre-existing Check).
 * Cashier orderId path consumes the certified Collection Fact writer.
 */

import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import type { SettlementContext, SettlementContextHints } from "@shared/crmp";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import {
  CollectionFactError,
  assertCashierProductionPaymentIdentities,
  type CollectionFactTender,
} from "@shared/operational-session/payment/collection-fact";
import {
  settleCashierPosOrderPaidByIdDetailed,
  type CheckFinancialMutationResult,
} from "../check/CheckService";
import {
  commitCashierProductionCollectionFact,
  commitCashierProductionCollectionFactInTransaction,
} from "./collection-fact/commitCashierProductionCollectionFact";
import type { CollectionFactStore } from "./collection-fact/collectionFactStore";

export const PAYMENT_CONFIRM_PROGRAM_ID = "PAYMENT-CONFIRM-SERVICE-1" as const;

export type PaymentConfirmCommand = {
  restaurantId: number;
  checkId?: number;
  /** ADR-ARCH-038 — cashier_pos direct commit when no Check exists yet. */
  orderId?: number;
  /** Discount intent. Server applies via Check billDiscountAmount. */
  billDiscountAmount?: string;
  settlements?: readonly StaffSettlementLineInput[];
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
  /**
   * Cashier POS passes false so HTTP returns after financial commit.
   * Omitted callers keep CheckService default (await fail-open Attribution).
   */
  awaitAttribution?: boolean;
  /** Cashier production Collection Fact — payment identity. */
  paymentIntentId?: string;
  /** Cashier production Collection Fact — retry identity. */
  idempotencyKey?: string;
  /** Cashier production Collection Fact — mandatory terminal attribution. */
  terminalId?: string;
  actorType?: string;
  actorUserId?: number;
  actorDisplayName?: string | null;
  complimentary?: boolean;
  collectionFactStore?: CollectionFactStore;
};

function asCollectionTenders(
  tenders: readonly { paymentMethod: string; amount: string }[]
): CollectionFactTender[] {
  return tenders.map((line) => {
    const paymentMethod = line.paymentMethod;
    if (
      paymentMethod !== "cash" &&
      paymentMethod !== "card" &&
      paymentMethod !== "other"
    ) {
      throw new CollectionFactError(
        "VALIDATION",
        "Collection Fact tender paymentMethod is not canonical"
      );
    }
    return { paymentMethod, amount: line.amount };
  });
}

/**
 * Confirm a paid collection through Cashier orderId only.
 * Check-id Confirm is not a financial path.
 */
export async function confirmPayment(
  command: PaymentConfirmCommand
): Promise<CheckFinancialMutationResult> {
  const startedAt = Date.now();
  if (command.orderId == null) {
    throw new CollectionFactError(
      "VALIDATION",
      "Financial settlement requires Cashier Confirm"
    );
  }
  assertCashierProductionPaymentIdentities({
    paymentIntentId: command.paymentIntentId ?? "",
    idempotencyKey: command.idempotencyKey ?? "",
    orderId: command.orderId,
    terminalId: command.terminalId ?? "",
    actorType: command.actorType ?? "",
    actorUserId: command.actorUserId ?? 0,
  });
  let collectionFactOutcome: "created" | "replayed" | null = null;
  const result = await settleCashierPosOrderPaidByIdDetailed({
    restaurantId: command.restaurantId,
    orderId: command.orderId,
    billDiscountAmount: command.billDiscountAmount,
    settlements: command.settlements,
    settlementContext: command.settlementContext,
    settlementContextHints: command.settlementContextHints,
    awaitAttribution: command.awaitAttribution,
    deferOperationalSettlementAfterCollectionFact: true,
    terminalId: command.terminalId,
    actorUserId: command.actorUserId,
    actorDisplayName: command.actorDisplayName,
    complimentary: command.complimentary === true,
    productionCollectionCommit: async (freeze) => {
      const payload = {
        paymentIntentId: command.paymentIntentId as string,
        idempotencyKey: command.idempotencyKey as string,
        terminalId: command.terminalId as string,
        actorType: command.actorType as string,
        actorUserId: command.actorUserId as number,
        freeze: {
          ...freeze,
          tenders: asCollectionTenders(freeze.tenders),
        },
      };
      const committed = command.collectionFactStore
        ? await commitCashierProductionCollectionFact(
            payload,
            command.collectionFactStore
          )
        : await commitCashierProductionCollectionFactInTransaction(payload);
      collectionFactOutcome = committed.outcome;
    },
  });
  opsLog({
    type: OPS_EVENT.payment_confirm,
    category: "PAYMENT",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: command.restaurantId,
    action: "payment.confirm",
    metadata: {
      program: PAYMENT_CONFIRM_PROGRAM_ID,
      checkId: command.checkId ?? result.check.id,
      orderId: command.orderId ?? null,
      outcome:
        collectionFactOutcome != null ? "paid" : result.check.outcome,
      durationMs: Date.now() - startedAt,
      awaitAttribution: command.awaitAttribution !== false,
      collectionFactCommit: command.orderId != null,
      collectionFactOutcome,
    },
  });
  return result;
}
