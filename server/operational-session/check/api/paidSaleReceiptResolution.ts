/**
 * RECEIPT-SR-IDENTITY-1 — current Cashier paid-sale receipt from Collection Fact.
 * Read-only. Not a ledger. Does not write CF, PAID, or SR.
 *
 * Unique production CF → paid-sale receipt.
 * Zero production CFs → null (caller may use historical SR).
 * Multiple production CFs / wrong restaurant → fail closed.
 * Query failure must propagate (not legacy).
 */

import { getOrderById, getOrderItemsByOrderId } from "../../../db";
import { mapOrderDisplayIdentityFields } from "../../../order/read/presentation/mapOrderDisplayIdentity";
import {
  COLLECTION_FACT_PRODUCTION_PURPOSE,
  type CollectionFact,
} from "@shared/operational-session/payment/collection-fact";
import { listProductionCollectionFactsByOrderId } from "../../payment/collection-fact/collectionFactRepository";
import { cashierInvoiceNumberForOrder } from "../../../pos/cashier-invoice/cashierInvoiceRepository";
import type { SettlementRecordReceiptDto } from "./settlementRecordApiDtos";
import { settlementSourceChannelFromOrderingChannel } from "./settlementSourceChannel";

export class PaidSaleReceiptIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaidSaleReceiptIdentityError";
  }
}

export class AmbiguousPaidSaleReceiptError extends PaidSaleReceiptIdentityError {
  constructor(message: string) {
    super(message);
    this.name = "AmbiguousPaidSaleReceiptError";
  }
}

function parseAmount(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function toReceiptFromCollectionFact(input: {
  fact: CollectionFact;
  displayReference: string | null;
  invoiceNumber: string | null;
  sourceChannel: string | null;
  itemsSnapshot: SettlementRecordReceiptDto["itemsSnapshot"];
}): SettlementRecordReceiptDto {
  const { fact } = input;
  const complimentary = parseAmount(fact.amount) === 0;
  const outcome = complimentary ? "complimentary" : "paid";
  const documentNumber =
    input.invoiceNumber?.trim() ||
    input.displayReference ||
    String(fact.orderId);
  return {
    settlementRecordId: "",
    settlementNumber: documentNumber,
    documentNumber,
    documentType: "settlement",
    refundNumber: null,
    originSettlementNumber: null,
    settlementTime: fact.committedAt,
    settlementStatus: complimentary ? "complimentary" : "settled",
    recordKind: "settlement",
    recordGeneration: 1,
    priorSettlementRecordId: null,
    businessDay: fact.businessDay,
    invoiceNumber: input.invoiceNumber?.trim() || null,
    sourceChannel: input.sourceChannel,
    orders: [
      {
        orderId: fact.orderId,
        displayReference: input.displayReference,
      },
    ],
    itemsSnapshot: input.itemsSnapshot,
    paymentMethods: fact.tenders.map((tender) => ({
      paymentMethod: String(tender.paymentMethod),
      amount: String(tender.amount),
      currencyCode: fact.currencyCode,
      status: "captured",
      businessTimestamp: fact.committedAt,
    })),
    financialSnapshot: {
      subtotal: fact.subtotal,
      discountAmount: fact.discountAmount,
      taxAmount: fact.taxAmount,
      grandTotal: fact.amount,
      currencyCode: fact.currencySnapshot.currencyCode,
      currencySymbol: fact.currencySnapshot.currencySymbol,
    },
    taxSnapshot: {
      totalTaxAmount: fact.taxBreakdown.totalTaxAmount,
      lines: fact.taxBreakdown.lines.map((line) => ({
        name: String(line.name),
        ratePercent: String(line.ratePercent),
        amount: String(line.amount),
      })),
    },
    grandTotal: fact.amount,
    currencyCode: fact.currencySnapshot.currencyCode,
    currencySymbol: fact.currencySnapshot.currencySymbol,
    outcome,
  };
}

/**
 * Resolve a current Cashier paid-sale receipt from production Collection Fact.
 * Returns null only when no production CF exists (legacy SR path).
 */
export async function resolvePaidSaleReceiptFromCollectionFact(input: {
  restaurantId: number;
  orderId: number;
}): Promise<SettlementRecordReceiptDto | null> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new PaidSaleReceiptIdentityError(
      "RECEIPT-SR-IDENTITY-01: restaurantId required"
    );
  }
  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    throw new PaidSaleReceiptIdentityError(
      "RECEIPT-SR-IDENTITY-01: orderId required"
    );
  }

  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new PaidSaleReceiptIdentityError(
      "RECEIPT-SR-IDENTITY-01: order not found"
    );
  }
  if (order.restaurantId !== input.restaurantId) {
    throw new PaidSaleReceiptIdentityError(
      "RECEIPT-SR-IDENTITY-03: order restaurant does not match receipt restaurant"
    );
  }

  // Query failure must propagate. Empty rows are the only no-CF case.
  const facts = await listProductionCollectionFactsByOrderId({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
  });
  const production = facts.filter(
    (fact) => fact.purpose === COLLECTION_FACT_PRODUCTION_PURPOSE
  );
  const unique = new Map<string, CollectionFact>();
  for (const fact of production) {
    if (fact.restaurantId !== input.restaurantId) {
      throw new PaidSaleReceiptIdentityError(
        "RECEIPT-SR-IDENTITY-03: Collection Fact restaurant does not match"
      );
    }
    unique.set(fact.collectionFactId, fact);
  }

  if (unique.size === 0) {
    return null;
  }
  if (unique.size > 1) {
    throw new AmbiguousPaidSaleReceiptError(
      `RECEIPT-SR-IDENTITY-02: ${unique.size} production Collection Facts for order=${input.orderId} — fail closed`
    );
  }

  const fact = [...unique.values()][0]!;
  const identity = mapOrderDisplayIdentityFields({
    orderNumber: order.orderNumber?.trim() || String(input.orderId),
    businessDay: order.businessDay ?? null,
    dailyDisplayNumber: order.dailyDisplayNumber ?? null,
    identityScope: order.identityScope ?? null,
    fulfilmentAnchorType: order.fulfilmentAnchorType ?? null,
    serviceMode: order.serviceMode ?? null,
  });
  const items = await getOrderItemsByOrderId(input.orderId);
  const itemsSnapshot = items.map((item) => ({
    orderId: input.orderId,
    name: String(item.nameEn || item.nameAr || "Item"),
    quantity: Number(item.quantity ?? 0),
    unitPrice: item.price != null ? String(item.price) : null,
    lineTotal: null,
  }));
  const invoiceNumber = await cashierInvoiceNumberForOrder({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
  });

  return toReceiptFromCollectionFact({
    fact,
    displayReference: identity.displayReference,
    invoiceNumber,
    sourceChannel: settlementSourceChannelFromOrderingChannel(
      order.orderingChannel
    ),
    itemsSnapshot,
  });
}
