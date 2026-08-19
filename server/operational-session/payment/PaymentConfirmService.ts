/**
 * PAYMENT-CONFIRM-SERVICE-1 / PAYMENT-CONFIRM-REMAINING-CALLERS-1 / ADR-ARCH-037
 * Payment process entry for Confirm Payment. Delegates to the certified
 * Check settlement capability. Not an aggregate. Not a second money SSOT.
 *
 * Callers: Cashier POS, Session markPaid, SettleOrderPaid, Counter Pickup.
 * I-PAY-01 process owner · I-PAY-02 Check remains the aggregate · I-PAY-14
 * CheckService may still host finalizeOpenCheckById.
 */

import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import type { SettlementContext, SettlementContextHints } from "@shared/crmp";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import {
  settleCheckPaidByIdDetailed,
  type CheckFinancialMutationResult,
} from "../check/CheckService";

export const PAYMENT_CONFIRM_PROGRAM_ID = "PAYMENT-CONFIRM-SERVICE-1" as const;

export type PaymentConfirmCommand = {
  restaurantId: number;
  checkId: number;
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
 * Confirm a paid collection against an existing Check obligation.
 * Does not compute grandTotal / amountDue / remaining. Check finalize does.
 */
export async function confirmPayment(
  command: PaymentConfirmCommand
): Promise<CheckFinancialMutationResult> {
  const startedAt = Date.now();
  const result = await settleCheckPaidByIdDetailed({
    restaurantId: command.restaurantId,
    checkId: command.checkId,
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
      checkId: command.checkId,
      outcome: result.check.outcome,
      durationMs: Date.now() - startedAt,
      awaitAttribution: command.awaitAttribution !== false,
    },
  });
  return result;
}
