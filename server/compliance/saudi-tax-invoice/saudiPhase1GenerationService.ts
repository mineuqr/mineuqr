/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * SAUDI-TAX-INVOICE-PHASE-1-QR-UNIFICATION-1 — QR for Simplified + Standard.
 * Apply Phase 1 generation (number + QR + structured document) onto an existing Tax Invoice.
 * Idempotent. Does not mutate Collection Fact / PAID.
 */

import {
  buildSaudiPhase1Document,
  buildSaudiPhase1QrPayloadBase64,
  saudiPhase1QrRequired,
  type SaudiPhase1Document,
  type SaudiTaxInvoice,
} from "@shared/compliance";
import { allocateSaudiTaxInvoiceNumber } from "./saudiTaxInvoiceNumberAllocator";
import {
  findSaudiTaxInvoiceByTaxInvoiceId,
  markSaudiTaxInvoicePhase1Failure,
  persistSaudiPhase1Artifact,
} from "./saudiTaxInvoiceRepository";

function resolveIssueTimestampIso(taxInvoice: SaudiTaxInvoice): string {
  if (taxInvoice.issueTimestampIso) return taxInvoice.issueTimestampIso;
  if (taxInvoice.issuedAt) {
    const normalized = taxInvoice.issuedAt.includes("T")
      ? taxInvoice.issuedAt
      : taxInvoice.issuedAt.replace(" ", "T");
    const withZ = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized)
      ? normalized
      : `${normalized}Z`;
    const date = new Date(withZ);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function sellerVatForPhase1(taxInvoice: SaudiTaxInvoice): string | null {
  const vat = taxInvoice.sellerSnapshot.vatNumber?.trim();
  return vat ? vat : null;
}

/**
 * Completes Phase 1 generation fields if missing. Replays existing Phase 1 artifact.
 */
export async function applySaudiPhase1Generation(
  taxInvoice: SaudiTaxInvoice
): Promise<SaudiTaxInvoice> {
  if (taxInvoice.phase1Document && taxInvoice.invoiceNumber) {
    return taxInvoice;
  }

  // CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1 — peer ensure may have finished.
  const latest = await findSaudiTaxInvoiceByTaxInvoiceId({
    restaurantId: taxInvoice.restaurantId,
    taxInvoiceId: taxInvoice.taxInvoiceId,
  });
  if (latest?.phase1Document && latest.invoiceNumber) {
    return latest;
  }
  const working = latest ?? taxInvoice;

  if (working.status === "blocked_profile") {
    return working;
  }

  if (
    working.invoiceForm === "undetermined" ||
    working.partyModel === "unclassified"
  ) {
    return markSaudiTaxInvoicePhase1Failure({
      restaurantId: working.restaurantId,
      taxInvoiceId: working.taxInvoiceId,
      status: "retryable",
      failureCode: "CLASSIFICATION_UNRESOLVED",
      failureMessage:
        "Phase 1 generation blocked: invoice classification is unresolved (PAID unchanged).",
      attemptCount: working.attemptCount + 1,
    });
  }

  const sellerName = working.sellerSnapshot.legalName?.trim() ?? "";
  const sellerVat = sellerVatForPhase1(working);
  const qrRequired = saudiPhase1QrRequired(working.invoiceForm);

  if (!sellerName) {
    return markSaudiTaxInvoicePhase1Failure({
      restaurantId: working.restaurantId,
      taxInvoiceId: working.taxInvoiceId,
      status: "retryable",
      failureCode: "PHASE1_SELLER_NAME_MISSING",
      failureMessage:
        "Phase 1 generation blocked: seller legal name missing (PAID unchanged).",
      attemptCount: working.attemptCount + 1,
    });
  }

  if (!sellerVat) {
    return markSaudiTaxInvoicePhase1Failure({
      restaurantId: working.restaurantId,
      taxInvoiceId: working.taxInvoiceId,
      status: "retryable",
      failureCode: "PHASE1_SELLER_VAT_MISSING",
      failureMessage:
        "Phase 1 generation blocked: seller VAT number required for Phase 1 QR/invoice fields (OQ-SELLER-1 / PAID unchanged).",
      attemptCount: working.attemptCount + 1,
    });
  }

  if (!qrRequired) {
    return markSaudiTaxInvoicePhase1Failure({
      restaurantId: working.restaurantId,
      taxInvoiceId: working.taxInvoiceId,
      status: "retryable",
      failureCode: "PHASE1_QR_POLICY_UNSUPPORTED_FORM",
      failureMessage:
        "Phase 1 generation blocked: invoice form is not eligible for Saudi Phase 1 QR policy (PAID unchanged).",
      attemptCount: working.attemptCount + 1,
    });
  }

  const issueTimestampIso = resolveIssueTimestampIso(working);
  let qrPayloadBase64: string;

  try {
    qrPayloadBase64 = buildSaudiPhase1QrPayloadBase64({
      sellerName,
      sellerVatNumber: sellerVat,
      timestampIso: issueTimestampIso,
      invoiceTotalWithVat: working.monetarySnapshot.amount,
      vatTotal: working.monetarySnapshot.taxAmount,
    });
  } catch (error) {
    return markSaudiTaxInvoicePhase1Failure({
      restaurantId: working.restaurantId,
      taxInvoiceId: working.taxInvoiceId,
      status: "retryable",
      failureCode: "PHASE1_QR_BUILD_FAILED",
      failureMessage:
        error instanceof Error
          ? error.message
          : "Phase 1 QR build failed (PAID unchanged).",
      attemptCount: working.attemptCount + 1,
    });
  }

  const allocated =
    working.invoiceNumber && working.invoiceSequence != null
      ? {
          invoiceNumber: working.invoiceNumber,
          sequenceNumber: working.invoiceSequence,
        }
      : await allocateSaudiTaxInvoiceNumber(working.restaurantId);

  const document: SaudiPhase1Document = buildSaudiPhase1Document({
    taxInvoice: working,
    invoiceNumber: allocated.invoiceNumber,
    issueTimestampIso,
    qrPayloadBase64,
  });

  return persistSaudiPhase1Artifact({
    restaurantId: working.restaurantId,
    taxInvoiceId: working.taxInvoiceId,
    status: "generated",
    invoiceNumber: allocated.invoiceNumber,
    invoiceSequence: allocated.sequenceNumber,
    issueTimestampIso,
    qrPayloadBase64,
    phase1DocumentJson: document,
    failureCode: null,
    failureMessage: null,
    attemptCount: working.attemptCount,
  });
}
