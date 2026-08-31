/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Immutable snapshot builders at Tax Invoice issuance.
 */

import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";
import type { Customer } from "@shared/customer";
import type { SaudiTaxProfile, SaudiTaxProfileReadiness } from "@shared/compliance";
import type {
  SaudiTaxInvoiceBuyerSnapshot,
  SaudiTaxInvoiceLinesSnapshot,
  SaudiTaxInvoiceMonetarySnapshot,
  SaudiTaxInvoicePaymentSnapshot,
  SaudiTaxInvoiceSellerSnapshot,
} from "@shared/compliance";

export function buildSellerSnapshot(input: {
  profile: SaudiTaxProfile | null;
  readiness: SaudiTaxProfileReadiness;
}): SaudiTaxInvoiceSellerSnapshot {
  const { profile, readiness } = input;
  if (!profile) {
    return {
      kind: "not_configured",
      profileId: null,
      legalName: null,
      vatRegistrationStatus: null,
      vatNumber: null,
      registeredAddress: null,
    };
  }
  return {
    kind: readiness === "READY" ? "ready" : "incomplete",
    profileId: profile.id,
    legalName: profile.legalName,
    vatRegistrationStatus: profile.vatRegistrationStatus,
    vatNumber: profile.vatNumber,
    registeredAddress: profile.registeredAddress,
  };
}

export function buildBuyerSnapshot(input: {
  customer: Customer | null;
}): SaudiTaxInvoiceBuyerSnapshot {
  const { customer } = input;
  if (!customer) {
    return {
      kind: "anonymous_cash",
      customerId: null,
      displayName: null,
      customerType: null,
      phone: null,
      email: null,
      address: null,
      taxNumber: null,
    };
  }
  return {
    kind: "customer",
    customerId: customer.id,
    displayName: customer.displayName,
    customerType: customer.customerType,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    taxNumber: customer.taxNumber,
  };
}

export type OrderItemSnapshotSource = Readonly<{
  id: number;
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  price: string;
  quantity: number;
  notes: string | null;
  modifiers: string[] | null;
}>;

function lineAmount(unitPrice: string, quantity: number): string {
  const unit = Number(unitPrice);
  if (!Number.isFinite(unit)) return unitPrice;
  return (unit * quantity).toFixed(2);
}

export function buildLinesSnapshot(input: {
  orderItems: readonly OrderItemSnapshotSource[];
  collectionFact: CollectionFact;
}): SaudiTaxInvoiceLinesSnapshot {
  return {
    source: "order_items_plus_collection_fact_composition",
    orderLines: input.orderItems.map((item) => ({
      sourceOrderItemId: item.id,
      menuItemId: item.menuItemId,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      quantity: item.quantity,
      unitPrice: item.price,
      lineAmount: lineAmount(item.price, item.quantity),
      notes: item.notes,
      modifiers: item.modifiers,
    })),
    collectionFactComposition: input.collectionFact.composition.map((line) => ({
      sequence: line.sequence,
      description: line.description,
      netAmount: line.netAmount,
      taxAmount: line.taxAmount,
      originOrderId: line.originOrderId,
    })),
    vatLineSsot: "deferred_oq_vat_1",
  };
}

export function buildMonetarySnapshot(
  collectionFact: CollectionFact
): SaudiTaxInvoiceMonetarySnapshot {
  return {
    source: "collection_fact",
    subtotal: collectionFact.subtotal,
    discountAmount: collectionFact.discountAmount,
    taxAmount: collectionFact.taxAmount,
    amount: collectionFact.amount,
    currencyCode: collectionFact.currencyCode,
    taxAmountMeaning: "collection_fact_copy_not_saudi_vat_engine",
    oqVat1: "deferred",
  };
}

export function buildPaymentSnapshot(
  collectionFact: CollectionFact
): SaudiTaxInvoicePaymentSnapshot {
  return {
    source: "collection_fact",
    tenders: collectionFact.tenders.map((t) => ({
      paymentMethod: t.paymentMethod,
      amount: t.amount,
    })),
  };
}
