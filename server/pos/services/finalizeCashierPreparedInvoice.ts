/**
 * CASHIER-PASS-2-CONFIRM-FINALIZATION-1
 * Confirm converts prepared invoice intent into Order + items + Collection Fact
 * in the Order persist transaction. PAID is CF commit. No Check in this TX.
 */
import { createStationFulfilmentAnchor } from "@shared/ordering-platform/orderingIdentityContract";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import type { StaffSettlementLineInput } from "@shared/operational-session";
import { CollectionFactError } from "@shared/operational-session/payment/collection-fact";
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import type { IdentityPlaceOrderService } from "../../order/application/IdentityPlaceOrderService";
import { runOrderCommand } from "../../order/application/mapOrderDomainError";
import {
  captureSnapshotsFromBusinessSettings,
  deliverCashierPosOperationalSettlementAfterPaid,
} from "../../operational-session/check/CheckService";
import { freezeCashierPosPayableFromOrder } from "../../operational-session/payment/cashierPosOrderFreeze";
import { buildCashierPaidReceiptProjection } from "../../operational-session/payment/cashierPaidReceiptProjection";
import type { CashierPaidReceiptProjection } from "../../operational-session/payment/cashierPaidReceiptProjection";
import {
  commitCashierProductionCollectionFact,
  type CashierPaidMoneyFreeze,
} from "../../operational-session/payment/collection-fact/commitCashierProductionCollectionFact";
import { createDrizzleCollectionFactStore } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import { dispatchBestEffortDownstreamDelivery } from "../../operational-session/payment/dispatchBestEffortDownstreamDelivery";
import {
  allocateCashierInvoiceForOrder,
} from "../cashier-invoice/cashierInvoiceRepository";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import type { SettlementContext } from "@shared/crmp";

export type CashierPreparedInvoiceLineInput = {
  menuItemId: number;
  quantity: number;
  notes?: string | null;
  modifiers?: readonly string[] | null;
};

export type FinalizeCashierPreparedInvoiceInput = {
  restaurantId: number;
  terminalId: string;
  items: readonly CashierPreparedInvoiceLineInput[];
  billDiscountAmount?: string;
  settlements?: readonly StaffSettlementLineInput[];
  complimentary?: boolean;
  paymentIntentId: string;
  idempotencyKey: string;
  actorUserId: number;
  actorDisplayName?: string | null;
  settlementContext?: SettlementContext;
  settlementContextHints?: {
    registerId: string;
    operatorUserId: number;
    deviceId?: string | null;
  };
};

export type FinalizeCashierPreparedInvoiceResult = {
  orderId: number;
  grandTotal: string;
  paidReceipt: CashierPaidReceiptProjection;
};

export async function finalizeCashierPreparedInvoice(
  placeOrder: IdentityPlaceOrderService,
  input: FinalizeCashierPreparedInvoiceInput
): Promise<FinalizeCashierPreparedInvoiceResult> {
  if (input.items.length === 0) {
    throw new CollectionFactError("VALIDATION", "Prepared invoice items are required");
  }
  const snapshots = await captureSnapshotsFromBusinessSettings(input.restaurantId);
  let freeze: CashierPaidMoneyFreeze | undefined;
  let receiptInvoiceLines: Awaited<
    ReturnType<typeof freezeCashierPosPayableFromOrder>
  >["receiptInvoiceLines"] = [];
  let businessDay: string | null = null;
  let dailyDisplayNumber: number | null = null;
  let identityScope: string | null = "POS";
  let invoiceNumber: string | null = null;

  const placed = await runOrderCommand(
    () =>
      placeOrder.execute(
        {
          restaurantId: input.restaurantId,
          serviceMode: "counter",
          fulfilmentAnchor: createStationFulfilmentAnchor({
            stationId: input.terminalId,
            fulfilmentLabel: input.terminalId,
          }),
          identityScope: "POS",
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
          items: input.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes,
            modifiers: item.modifiers,
          })),
        },
        {
          enrollCheck: false,
          afterPersistInTransaction: async (tx, result) => {
            const orderId = result.order.id;
            if (orderId == null) {
              throw new CollectionFactError(
                "STORAGE",
                "Persisted order identity is required for Collection Fact"
              );
            }
            const payable = await freezeCashierPosPayableFromOrder({
              restaurantId: input.restaurantId,
              order: {
                id: orderId,
                restaurantId: input.restaurantId,
                orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
                status: result.order.status,
                orderNumber: result.order.orderNumber,
                totalAmount: result.order.totalAmount,
              },
              billDiscountAmount: input.billDiscountAmount ?? "0.00",
              snapshots,
              settlements: input.settlements,
              complimentary: input.complimentary === true,
              client: tx as SessionDbClient,
            });
            freeze = payable.freeze;
            receiptInvoiceLines = payable.receiptInvoiceLines;
            businessDay = result.businessIdentity?.businessDay ?? null;
            dailyDisplayNumber = result.businessIdentity?.dailyDisplayNumber ?? null;
            identityScope = result.businessIdentity?.identityScope ?? "POS";
            const invoice = await allocateCashierInvoiceForOrder(
              { restaurantId: input.restaurantId, orderId },
              tx as SessionDbClient
            );
            invoiceNumber = invoice.invoiceNumber;
            await commitCashierProductionCollectionFact(
              {
                paymentIntentId: input.paymentIntentId,
                idempotencyKey: input.idempotencyKey,
                terminalId: input.terminalId,
                actorType: "staff_user",
                actorUserId: input.actorUserId,
                freeze,
              },
              createDrizzleCollectionFactStore(tx as SessionDbClient)
            );
          },
        }
      ),
    { awaitRelay: false }
  );

  const orderId = placed.order.id;
  if (orderId == null || freeze == null) {
    throw new CollectionFactError(
      "STORAGE",
      "Confirm did not persist Order and Collection Fact together"
    );
  }

  const paidAt = new Date().toISOString();
  const paidReceipt = buildCashierPaidReceiptProjection({
    freeze,
    receiptInvoiceLines,
    order: {
      id: orderId,
      orderNumber: placed.orderNumber,
      businessDay,
      dailyDisplayNumber,
      identityScope,
      fulfilmentAnchorType: placed.order.fulfilmentAnchorType,
      serviceMode: placed.order.serviceMode,
    },
    paidAt,
    cashierUserId: input.actorUserId,
    cashierDisplayName: input.actorDisplayName,
    terminalId: input.terminalId,
    invoiceNumber,
  });
  const displayReference = placed.displayReference?.trim()
    ? placed.displayReference
    : paidReceipt.displayReference;
  const receipt = { ...paidReceipt, displayReference };

  dispatchBestEffortDownstreamDelivery({
    delivery: () =>
      deliverCashierPosOperationalSettlementAfterPaid({
        restaurantId: input.restaurantId,
        orderId,
        billDiscountAmount: input.billDiscountAmount ?? "0.00",
        settlements: input.settlements,
        settlementContext: input.settlementContext,
        settlementContextHints: input.settlementContextHints,
      }),
    onFailure: (err: unknown) => {
      opsLog({
        type: OPS_EVENT.check_operational_settlement_deferred_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "cashierDownstreamDelivery",
        metadata: {
          orderId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    },
  });

  return {
    orderId,
    grandTotal: freeze.grandTotal,
    paidReceipt: receipt,
  };
}
