/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Registers Tax Invoice domain ensure into the Saudi compliance module boundary.
 */

import {
  registerSaudiTaxInvoiceDomainHandler,
  type ProductionCollectionFactCommittedEvent,
} from "@shared/compliance";
import { ensureSaudiTaxInvoiceForCollectionFact } from "./saudiTaxInvoiceService";

async function handleProductionCollectionFactCommitted(
  event: ProductionCollectionFactCommittedEvent
): Promise<void> {
  await ensureSaudiTaxInvoiceForCollectionFact({
    collectionFactId: event.collectionFactId,
    restaurantId: event.restaurantId,
    countryCode: event.countryCode,
    orderId: event.orderId,
    committedAt: event.committedAt,
    commitOutcome: event.commitOutcome,
    cashierInvoiceNumber: event.cashierInvoiceNumber,
  });
}

let registered = false;

export function ensureSaudiTaxInvoiceDomainRegistered(): void {
  if (registered) return;
  registerSaudiTaxInvoiceDomainHandler(handleProductionCollectionFactCommitted);
  registered = true;
}

// Side-effect registration when Compliance dispatch path loads this module.
ensureSaudiTaxInvoiceDomainRegistered();
