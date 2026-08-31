/**
 * SAUDI-TAX-INVOICE-PHASE-1 — classification for generation.
 *
 * Forbidden sole rule: customer.taxNumber ? B2B : B2C
 * Missing taxNumber MUST NOT mean non-tax invoice.
 *
 * Phase 1 generation policy (documented; OQ-CLASS-1 remains open for individuals):
 * - absent buyer → Simplified / B2C (platform invariant)
 * - business + taxNumber → Tax Invoice / B2B (buyer VAT presented from snapshot)
 * - other named buyers → Simplified / B2C (still a tax invoice; policy pending confirmation)
 */

import type { SaudiTaxInvoiceClassification } from "./saudiTaxInvoiceContract";

export type SaudiTaxInvoiceClassificationInput = Readonly<{
  buyerPresence: "absent" | "present";
  customerType: "individual" | "business" | null;
  taxNumberPresent: boolean;
}>;

export function classifySaudiTaxInvoiceFoundation(
  input: SaudiTaxInvoiceClassificationInput
): SaudiTaxInvoiceClassification {
  if (input.buyerPresence === "absent") {
    return {
      partyModel: "b2c",
      invoiceForm: "simplified_tax_invoice",
      rationaleCode: "FOUNDATION_ANONYMOUS_BUYER_B2C_CONTEXT",
      policyStatus: "platform_invariant",
      blockingIssues: [],
      notes:
        "Null Sale.customerId → B2C context → Simplified Tax Invoice. Not a non-tax invoice.",
    };
  }

  // Not taxNumber-alone. Business buyer with tax number → Standard Tax Invoice path.
  if (input.customerType === "business" && input.taxNumberPresent) {
    return {
      partyModel: "b2b",
      invoiceForm: "standard_tax_invoice",
      rationaleCode: "PHASE1_BUSINESS_BUYER_WITH_TAX_NUMBER",
      policyStatus: "platform_invariant",
      blockingIssues: [],
      notes:
        "Business buyer with tax number → Tax Invoice form. taxNumber alone without business type does not decide B2B.",
    };
  }

  // Named individual / business without tax number — still a tax invoice (Simplified).
  // OQ-CLASS-1 remains open for official confirmation of this product default.
  return {
    partyModel: "b2c",
    invoiceForm: "simplified_tax_invoice",
    rationaleCode: "PHASE1_NAMED_BUYER_DEFAULT_SIMPLIFIED",
    policyStatus: "needs_official_confirmation",
    blockingIssues: [],
    notes:
      "Named buyer without business+taxNumber combination defaults to Simplified Tax Invoice for Phase 1 generation. Not a non-tax invoice. OQ-CLASS-1.",
  };
}
