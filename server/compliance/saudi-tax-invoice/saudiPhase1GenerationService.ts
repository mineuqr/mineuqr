/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * Apply Phase 1 generation (number + QR + structured document) onto an existing Tax Invoice.
 * Idempotent. Does not mutate Collection Fact / PAID.
 */

import {
  buildSaudiPhase1Document,
  buildSaudiPhase1QrPayloadBase64,
  isSimplifiedTaxInvoiceForm,
  type SaudiPhase1Document,
  type SaudiTaxInvoice,
} from "@shared/compliance";
import { allocateSaudiTaxInvoiceNumber } from "./saudiTaxInvoiceNumberAllocator";
import {
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

  if (taxInvoice.status === "blocked_profile") {
    return taxInvoice;
  }

  if (
    taxInvoice.invoiceForm === "undetermined" ||
    taxInvoice.partyModel === "unclassified"
  ) {
    return markSaudiTaxInvoicePhase1Failure({
      restaurantId: taxInvoice.restaurantId,
      taxInvoiceId: taxInvoice.taxInvoiceId,
      status: "retryable",
      failureCode: "CLASSIFICATION_UNRESOLVED",
      failureMessage:
        "Phase 1 generation blocked: invoice classification is unresolved (PAID unchanged).",
      attemptCount: taxInvoice.attemptCount + 1,
    });
  }

  const sellerName = taxInvoice.sellerSnapshot.legalName?.trim() ?? "";
  const sellerVat = sellerVatForPhase1(taxInvoice);
  const qrRequired = isSimplifiedTaxInvoiceForm(taxInvoice.invoiceForm);

  if (!sellerName) {
    return markSaudiTaxInvoicePhase1Failure({
      restaurantId: taxInvoice.restaurantId,
      taxInvoiceId: taxInvoice.taxInvoiceId,
      status: "retryable",
      failureCode: "PHASE1_SELLER_NAME_MISSING",
      failureMessage:
        "Phase 1 generation blocked: seller legal name missing (PAID unchanged).",
      attemptCount: taxInvoice.attemptCount + 1,
    });
  }

  if (!sellerVat) {
    return markSaudiTaxInvoicePhase1Failure({
      restaurantId: taxInvoice.restaurantId,
      taxInvoiceId: taxInvoice.taxInvoiceId,
      status: "retryable",
      failureCode: "PHASE1_SELLER_VAT_MISSING",
      failureMessage:
        "Phase 1 generation blocked: seller VAT number required for Phase 1 QR/invoice fields (OQ-SELLER-1 / PAID unchanged).",
      attemptCount: taxInvoice.attemptCount + 1,
    });
  }

  const issueTimestampIso = resolveIssueTimestampIso(taxInvoice);
  let qrPayloadBase64: string | null = null;

  if (qrRequired) {
    try {
      qrPayloadBase64 = buildSaudiPhase1QrPayloadBase64({
        sellerName,
        sellerVatNumber: sellerVat,
        timestampIso: issueTimestampIso,
        invoiceTotalWithVat: taxInvoice.monetarySnapshot.amount,
        vatTotal: taxInvoice.monetarySnapshot.taxAmount,
      });
    } catch (error) {
      return markSaudiTaxInvoicePhase1Failure({
        restaurantId: taxInvoice.restaurantId,
        taxInvoiceId: taxInvoice.taxInvoiceId,
        status: "retryable",
        failureCode: "PHASE1_QR_BUILD_FAILED",
        failureMessage:
          error instanceof Error
            ? error.message
            : "Phase 1 QR build failed (PAID unchanged).",
        attemptCount: taxInvoice.attemptCount + 1,
      });
    }
  }

  const allocated =
    taxInvoice.invoiceNumber && taxInvoice.invoiceSequence != null
      ? {
          invoiceNumber: taxInvoice.invoiceNumber,
          sequenceNumber: taxInvoice.invoiceSequence,
        }
      : await allocateSaudiTaxInvoiceNumber(taxInvoice.restaurantId);

  const document: SaudiPhase1Document = buildSaudiPhase1Document({
    taxInvoice,
    invoiceNumber: allocated.invoiceNumber,
    issueTimestampIso,
    qrPayloadBase64,
  });

  return persistSaudiPhase1Artifact({
    restaurantId: taxInvoice.restaurantId,
    taxInvoiceId: taxInvoice.taxInvoiceId,
    status: "generated",
    invoiceNumber: allocated.invoiceNumber,
    invoiceSequence: allocated.sequenceNumber,
    issueTimestampIso,
    qrPayloadBase64,
    phase1DocumentJson: document,
    failureCode: null,
    failureMessage: null,
    attemptCount: taxInvoice.attemptCount,
  });
}
