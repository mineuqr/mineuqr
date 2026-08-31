/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * Tenant-scoped Tax Invoice read / render for Phase 1 electronic documents.
 */

import type { SaudiPhase1Document, SaudiTaxInvoice } from "@shared/compliance";
import {
  findSaudiTaxInvoiceByOrderId,
  findSaudiTaxInvoiceByTaxInvoiceId,
} from "./saudiTaxInvoiceRepository";
import { applySaudiPhase1Generation } from "./saudiPhase1GenerationService";
import { renderSaudiPhase1InvoiceHtml } from "./saudiPhase1RenderHtml";

async function ensurePhase1Ready(
  taxInvoice: SaudiTaxInvoice
): Promise<SaudiTaxInvoice> {
  if (taxInvoice.phase1Document && taxInvoice.invoiceNumber) {
    return taxInvoice;
  }
  if (taxInvoice.status === "generated" || taxInvoice.status === "retryable") {
    return applySaudiPhase1Generation(taxInvoice);
  }
  return taxInvoice;
}

export async function getSaudiTaxInvoicePhase1View(input: {
  restaurantId: number;
  taxInvoiceId: string;
}): Promise<{
  taxInvoice: SaudiTaxInvoice;
  document: SaudiPhase1Document | null;
  html: string | null;
} | null> {
  const found = await findSaudiTaxInvoiceByTaxInvoiceId(input);
  if (!found) return null;
  const taxInvoice = await ensurePhase1Ready(found);
  const document =
    (taxInvoice.phase1Document as SaudiPhase1Document | null) ?? null;
  const html = document ? await renderSaudiPhase1InvoiceHtml(document) : null;
  return { taxInvoice, document, html };
}

export async function getSaudiTaxInvoicePhase1ViewByOrder(input: {
  restaurantId: number;
  orderId: number;
}): Promise<{
  taxInvoice: SaudiTaxInvoice;
  document: SaudiPhase1Document | null;
  html: string | null;
} | null> {
  const found = await findSaudiTaxInvoiceByOrderId(input);
  if (!found) return null;
  return getSaudiTaxInvoicePhase1View({
    restaurantId: input.restaurantId,
    taxInvoiceId: found.taxInvoiceId,
  });
}
