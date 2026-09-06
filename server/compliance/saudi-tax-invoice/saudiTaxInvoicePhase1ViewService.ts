/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * SAUDI-TAX-INVOICE-CASHIER-POST-PAYMENT-PERFORMANCE-1 —
 * Cashier reads document/json; HTML+QR PNG is optional (expensive).
 * CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1 —
 * If the Tax Invoice row is missing on Cashier read, ensure from the
 * production Collection Fact (idempotent; does not mutate CF/PAID).
 * CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1 —
 * Prefer waiting briefly for background Compliance before read-path ensure
 * to avoid duplicate Phase 1 / sequence contention during "preparing".
 */

import type { SaudiPhase1Document, SaudiTaxInvoice } from "@shared/compliance";
import { findProductionCollectionFactByOrderId } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import { resolveAuthoritativeRestaurantCountryCode } from "../restaurantCountryContext";
import {
  findSaudiTaxInvoiceByOrderId,
  findSaudiTaxInvoiceByTaxInvoiceId,
} from "./saudiTaxInvoiceRepository";
import { applySaudiPhase1Generation } from "./saudiPhase1GenerationService";
import { renderSaudiPhase1InvoiceHtml } from "./saudiPhase1RenderHtml";
import { ensureSaudiTaxInvoiceForCollectionFact } from "./saudiTaxInvoiceService";

/** Prefer background completion before starting a second ensure. */
const READ_PATH_WAIT_FOR_BACKGROUND_MS = 1200;
const READ_PATH_WAIT_STEP_MS = 40;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function waitForSaudiTaxInvoiceRow(input: {
  restaurantId: number;
  orderId: number;
}): Promise<SaudiTaxInvoice | null> {
  const deadline = Date.now() + READ_PATH_WAIT_FOR_BACKGROUND_MS;
  for (;;) {
    const found = await findSaudiTaxInvoiceByOrderId(input);
    if (found) return found;
    if (Date.now() >= deadline) return null;
    await sleep(READ_PATH_WAIT_STEP_MS);
  }
}

/**
 * Read-path recovery when fire-and-forget Compliance has not yet persisted a row.
 * Idempotent ensure from production Collection Fact. Never mutates CF/PAID.
 */
async function ensureSaudiTaxInvoiceRowForOrderRead(input: {
  restaurantId: number;
  orderId: number;
}): Promise<SaudiTaxInvoice | null> {
  const fact = await findProductionCollectionFactByOrderId(input);
  if (!fact) return null;
  const countryCode =
    (await resolveAuthoritativeRestaurantCountryCode(input.restaurantId)) ?? "";
  if (countryCode !== "SA") return null;
  const ensured = await ensureSaudiTaxInvoiceForCollectionFact({
    collectionFactId: fact.collectionFactId,
    restaurantId: input.restaurantId,
    countryCode,
    orderId: input.orderId,
    committedAt: fact.committedAt,
    commitOutcome: "replayed",
    cashierInvoiceNumber: null,
  });
  return ensured.taxInvoice;
}

export async function getSaudiTaxInvoicePhase1View(input: {
  restaurantId: number;
  taxInvoiceId: string;
  /** Default false — Cashier does not need HTML; QR PNG render is costly. */
  includeHtml?: boolean;
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
  const includeHtml = input.includeHtml === true;
  const html =
    includeHtml && document
      ? await renderSaudiPhase1InvoiceHtml(document)
      : null;
  return { taxInvoice, document, html };
}

export async function getSaudiTaxInvoicePhase1ViewByOrder(input: {
  restaurantId: number;
  orderId: number;
  includeHtml?: boolean;
}): Promise<{
  taxInvoice: SaudiTaxInvoice;
  document: SaudiPhase1Document | null;
  html: string | null;
} | null> {
  let found = await findSaudiTaxInvoiceByOrderId(input);
  if (!found) {
    // Prefer background Compliance completion (same CF) before a second ensure.
    found = await waitForSaudiTaxInvoiceRow(input);
  }
  if (!found) {
    found = await ensureSaudiTaxInvoiceRowForOrderRead(input);
  }
  if (!found) return null;
  const taxInvoice = await ensurePhase1Ready(found);
  const document =
    (taxInvoice.phase1Document as SaudiPhase1Document | null) ?? null;
  const includeHtml = input.includeHtml === true;
  const html =
    includeHtml && document
      ? await renderSaudiPhase1InvoiceHtml(document)
      : null;
  return { taxInvoice, document, html };
}
