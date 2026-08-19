/**
 * PAYMENT-CONFIRM-SERVICE-1 / PAYMENT-CONFIRM-REMAINING-CALLERS-1 / ADR-ARCH-037
 * Payment process entry for Confirm Payment. Delegates to the certified
 * Check settlement capability. Not an aggregate. Not a second money SSOT.
 *
 * Callers: Cashier POS, Session markPaid, SettleOrderPaid, Counter Pickup.
 * I-PAY-01 process owner · I-PAY-02 Check remains the aggregate · I-PAY-14
 * CheckService may still host finalizeOpenCheckById.
 * ADR-ARCH-038 — cashier_pos may Confirm with orderId (no pre-existing Check).
 */

import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import type { SettlementContext, SettlementContextHints } from "@shared/crmp";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import {
  settleCashierPosOrderPaidByIdDetailed,
  settleCheckPaidByIdDetailed,
  type CheckFinancialMutationResult,
} from "../check/CheckService";

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
};

/**
 * Confirm a paid collection.
 * checkId path: existing OPEN Check (Session / kiosk / leftover OPEN).
 * orderId path: cashier_pos materialize+finalize in one financial TX.
 * Does not compute grandTotal / amountDue / remaining. Check finalize does.
 */
export async function confirmPayment(
  command: PaymentConfirmCommand
): Promise<CheckFinancialMutationResult> {
  const startedAt = Date.now();
  const result =
    command.orderId != null
      ? await settleCashierPosOrderPaidByIdDetailed({
          restaurantId: command.restaurantId,
          orderId: command.orderId,
          billDiscountAmount: command.billDiscountAmount,
          settlements: command.settlements,
          settlementContext: command.settlementContext,
          settlementContextHints: command.settlementContextHints,
          awaitAttribution: command.awaitAttribution,
        })
      : await settleCheckPaidByIdDetailed({
          restaurantId: command.restaurantId,
          checkId: command.checkId as number,
          settlements: command.settlements,
          settlementContext: command.settlementContext,
          settlementContextHints: command.settlementContextHints,
          awaitAttribution: command.awaitAttribution,
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
      outcome: result.check.outcome,
      durationMs: Date.now() - startedAt,
      awaitAttribution: command.awaitAttribution !== false,
    },
  });
  return result;
}
