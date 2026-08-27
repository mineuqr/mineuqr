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
import { isCashierFinalizableOrderingChannel } from "@shared/pos";
import { COMPLIMENTARY_COLLECTION_TENDER } from "@shared/pos";
import type { CashierPaidMoneyFreeze } from "./collection-fact/commitCashierProductionCollectionFact";
import type { CashierPaidReceiptInvoiceLine } from "./cashierPaidReceiptProjection";

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

export function mapOrderItemsToReceiptInvoiceLines(
  items: readonly {
    id?: number;
    nameAr?: string | null;
    nameEn?: string | null;
    quantity?: number | string | null;
    price?: string | number | null;
  }[],
  order: CashierPosOrderFreezeSource
): CashierPaidReceiptInvoiceLine[] {
  if (items.length === 0) {
    const unitPrice = String(order.totalAmount ?? "0.00");
    const netAmount = computeChargeNetAmount({
      unitPrice,
      quantity: 1,
      lineDiscount: "0.00",
      modifierAmount: "0.00",
    });
    if (netAmount === "0.00") return [];
    return [
      {
        nameAr: `طلب ${order.orderNumber ?? order.id}`,
        nameEn: `Order ${order.orderNumber ?? order.id}`,
        quantity: 1,
        unitPrice,
        lineTotal: netAmount,
      },
    ];
  }
  const lines: CashierPaidReceiptInvoiceLine[] = [];
  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) continue;
    const unitPrice = String(item.price ?? "0.00");
    const netAmount = computeChargeNetAmount({
      unitPrice,
      quantity,
      lineDiscount: "0.00",
      modifierAmount: "0.00",
    });
    lines.push({
      nameAr: item.nameAr || item.nameEn || `Item ${item.id}`,
      nameEn: item.nameEn || item.nameAr || `Item ${item.id}`,
      quantity,
      unitPrice,
      lineTotal: netAmount,
    });
  }
  return lines;
}

export async function freezeCashierPosPayableFromOrder(input: {
  restaurantId: number;
  order: CashierPosOrderFreezeSource;
  billDiscountAmount: string;
  snapshots: Pick<
    CashierPaidMoneyFreeze,
    "currencySnapshot" | "taxPolicySnapshot"
  >;
  settlements?: readonly StaffSettlementLineInput[];
  complimentary?: boolean;
  client?: SessionDbClient;
}): Promise<{
  freeze: CashierPaidMoneyFreeze;
  receiptInvoiceLines: readonly CashierPaidReceiptInvoiceLine[];
}> {
  if (input.order.restaurantId !== input.restaurantId) {
    throw new DiningSessionValidationError("Order not found");
  }
  if (!isCashierFinalizableOrderingChannel(input.order.orderingChannel)) {
    throw new DiningSessionValidationError(
      "Financial commit is limited to Cashier-finalizable ordering channels"
    );
  }
  if (input.order.status === "cancelled") {
    throw new DiningSessionValidationError("Order is not eligible");
  }

  const items = (await getOrderItemsByOrderId(input.order.id, input.client)) ?? [];
  const receiptInvoiceLines = mapOrderItemsToReceiptInvoiceLines(items, input.order);
  const compositionLines: CashierPaidMoneyFreeze["composition"] =
    receiptInvoiceLines.map((line, index) => ({
      sequence: index + 1,
      description: line.nameEn || line.nameAr,
      netAmount: line.lineTotal,
      taxAmount: "0.00",
      originOrderId: input.order.id,
    }));

  const chargesSubtotal = sumChargeNetAmounts(compositionLines);
  const billDiscountAmount = input.complimentary
    ? chargesSubtotal
    : input.billDiscountAmount;
  const money = computeCheckMoney({
    chargesSubtotal,
    billDiscountAmount,
    taxPolicySnapshot: input.snapshots.taxPolicySnapshot,
  });

  let tenders: CashierPaidMoneyFreeze["tenders"];
  try {
    if (input.complimentary) {
      if (chargesSubtotal === "0.00") {
        throw new DiningSessionValidationError(
          "Complimentary requires a non-empty bill"
        );
      }
      tenders = [COMPLIMENTARY_COLLECTION_TENDER];
    } else {
      const lines = input.settlements?.length
        ? resolveStaffSettlementLines(money.grandTotal, input.settlements)
        : [defaultPaidSettlementLine(money.grandTotal)];
      tenders = lines.map((line) => ({
        paymentMethod: line.paymentMethod,
        amount: line.amount,
      })) as CashierPaidMoneyFreeze["tenders"];
    }
  } catch (err) {
    if (err instanceof SettlementValidationError) {
      throw new DiningSessionValidationError(err.message);
    }
    throw err;
  }

  const now = formatDiningSessionTimestamp();
  return {
    freeze: {
      restaurantId: input.restaurantId,
      checkId: null,
      orderId: input.order.id,
      orderingChannel: input.order.orderingChannel,
      subtotal: money.subtotal,
      discountAmount: billDiscountAmount,
      taxAmount: money.taxAmount,
      grandTotal: money.grandTotal,
      currencySnapshot: input.snapshots.currencySnapshot,
      taxPolicySnapshot: input.snapshots.taxPolicySnapshot,
      taxBreakdown: money.taxBreakdown,
      businessDay: freezeBusinessDayFromTimestamp(now),
      tenders,
      composition: compositionLines,
    },
    receiptInvoiceLines,
  };
}
