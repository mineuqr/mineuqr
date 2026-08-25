/**
 * CASHIER-CONFIRM-FINANCIAL-COMMIT-DECOUPLING-1
 * Freeze the Cashier payable amount from persisted Order/Sale data.
 * Check charges are not the invoice. Client ticket totals are not trusted.
 */

import { getOrderItemsByOrderId } from "../../db";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import {
  DiningSessionValidationError,
  formatDiningSessionTimestamp,
} from "../../diningSession/sessionTypes";
import {
  computeCheckMoney,
  defaultPaidSettlementLine,
  resolveStaffSettlementLines,
  SettlementValidationError,
  type StaffSettlementLineInput,
} from "@shared/operational-session";
import { computeChargeNetAmount, sumChargeNetAmounts } from "@shared/operational-session/check/charge";
import { freezeBusinessDayFromTimestamp } from "@shared/operational-session/check/settlementRecord/settlementRecordSnapshot";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import type { CashierPaidMoneyFreeze } from "./collection-fact/commitCashierProductionCollectionFact";

/** Leftover POS checkId column filler. Not operational_checks.id. */
export const CASHIER_CONFIRM_UNASSIGNED_CHECK_ID = 0;

export type CashierPosOrderFreezeSource = {
  id: number;
  restaurantId: number;
  orderingChannel?: string | null;
  status?: string | null;
  orderNumber?: string | null;
  totalAmount?: string | number | null;
};

export async function freezeCashierPosPayableFromOrder(input: {
  restaurantId: number;
  order: CashierPosOrderFreezeSource;
  billDiscountAmount: string;
  snapshots: Pick<
    CashierPaidMoneyFreeze,
    "currencySnapshot" | "taxPolicySnapshot"
  >;
  settlements?: readonly StaffSettlementLineInput[];
  client?: SessionDbClient;
}): Promise<CashierPaidMoneyFreeze> {
  if (input.order.restaurantId !== input.restaurantId) {
    throw new DiningSessionValidationError("Order not found");
  }
  if (input.order.orderingChannel !== ORDERING_CHANNEL_CASHIER_POS) {
    throw new DiningSessionValidationError(
      "Direct financial commit is limited to cashier_pos"
    );
  }
  if (input.order.status === "cancelled") {
    throw new DiningSessionValidationError("Order is not eligible");
  }

  const items = (await getOrderItemsByOrderId(input.order.id, input.client)) ?? [];
  const compositionLines: CashierPaidMoneyFreeze["composition"] = [];
  if (items.length === 0) {
    const unitPrice = String(input.order.totalAmount ?? "0.00");
    const netAmount = computeChargeNetAmount({
      unitPrice,
      quantity: 1,
      lineDiscount: "0.00",
      modifierAmount: "0.00",
    });
    if (netAmount !== "0.00") {
      compositionLines.push({
        sequence: 1,
        description: `Order ${input.order.orderNumber ?? input.order.id}`,
        netAmount,
        taxAmount: "0.00",
        originOrderId: input.order.id,
      });
    }
  } else {
    let sequence = 1;
    for (const item of items) {
      const quantity = Number(item.quantity ?? 1);
      if (!Number.isInteger(quantity) || quantity < 1) continue;
      const netAmount = computeChargeNetAmount({
        unitPrice: String(item.price ?? "0.00"),
        quantity,
        lineDiscount: "0.00",
        modifierAmount: "0.00",
      });
      compositionLines.push({
        sequence,
        description: item.nameEn || item.nameAr || `Item ${item.id}`,
        netAmount,
        taxAmount: "0.00",
        originOrderId: input.order.id,
      });
      sequence += 1;
    }
  }

  const chargesSubtotal = sumChargeNetAmounts(compositionLines);
  const money = computeCheckMoney({
    chargesSubtotal,
    billDiscountAmount: input.billDiscountAmount,
    taxPolicySnapshot: input.snapshots.taxPolicySnapshot,
  });

  let tenders: CashierPaidMoneyFreeze["tenders"];
  try {
    const lines = input.settlements?.length
      ? resolveStaffSettlementLines(money.grandTotal, input.settlements)
      : [defaultPaidSettlementLine(money.grandTotal)];
    tenders = lines.map((line) => ({
      paymentMethod: line.paymentMethod,
      amount: line.amount,
    })) as CashierPaidMoneyFreeze["tenders"];
  } catch (err) {
    if (err instanceof SettlementValidationError) {
      throw new DiningSessionValidationError(err.message);
    }
    throw err;
  }

  const now = formatDiningSessionTimestamp();
  return {
    restaurantId: input.restaurantId,
    checkId: null,
    orderId: input.order.id,
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    subtotal: money.subtotal,
    discountAmount: input.billDiscountAmount,
    taxAmount: money.taxAmount,
    grandTotal: money.grandTotal,
    currencySnapshot: input.snapshots.currencySnapshot,
    taxPolicySnapshot: input.snapshots.taxPolicySnapshot,
    taxBreakdown: money.taxBreakdown,
    businessDay: freezeBusinessDayFromTimestamp(now),
    tenders,
    composition: compositionLines,
  };
}
