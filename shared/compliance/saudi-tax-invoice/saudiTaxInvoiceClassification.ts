/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Foundation classification storage helper — NOT a Saudi legal classification engine.
 *
 * Forbidden sole rule: customer.taxNumber ? B2B : B2C
 * Missing taxNumber MUST NOT mean non-tax invoice.
 * Customer presence MUST NOT alone decide invoice type.
 */

import type {
  SaudiTaxInvoiceClassification,
} from "./saudiTaxInvoiceContract";

export type SaudiTaxInvoiceClassificationInput = Readonly<{
  buyerPresence: "absent" | "present";
  customerType: "individual" | "business" | null;
  taxNumberPresent: boolean;
}>;

/**
 * Explicit foundation classification result for persistence.
 * Only the anonymous-buyer → B2C context path is a platform invariant.
 * Named-customer classification remains NEEDS_OFFICIAL_CONFIRMATION.
 */
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
        "Null Sale.customerId → B2C context → applicable Saudi tax invoice. Not a non-tax invoice. Display العميل: نقدًا is not a Customer record.",
    };
  }

  // Explicitly ignore taxNumber for B2B/B2C decision in this foundation.
  void input.taxNumberPresent;
  void input.customerType;

  return {
    partyModel: "unclassified",
    invoiceForm: "undetermined",
    rationaleCode: "FOUNDATION_AWAITING_OFFICIAL_CLASSIFICATION_POLICY",
    policyStatus: "needs_official_confirmation",
    blockingIssues: [],
    notes:
      "Customer is buyer identity only. taxNumber presence/absence does not decide B2B/B2C or Simplified/Standard. Official classification policy required (OQ-CLASS-1).",
  };
}
