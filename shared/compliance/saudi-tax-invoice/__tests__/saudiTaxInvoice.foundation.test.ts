/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 — classification + state unit tests.
 */
import { describe, expect, it } from "vitest";
import {
  classifySaudiTaxInvoiceFoundation,
  canTransitionSaudiTaxInvoiceStatus,
  isSaudiTaxInvoiceSnapshotImmutable,
} from "@shared/compliance";

describe("Saudi Tax Invoice foundation classification", () => {
  it("maps absent customer to B2C simplified context (platform invariant)", () => {
    const result = classifySaudiTaxInvoiceFoundation({
      buyerPresence: "absent",
      customerType: null,
      taxNumberPresent: false,
    });
    expect(result.partyModel).toBe("b2c");
    expect(result.invoiceForm).toBe("simplified_tax_invoice");
    expect(result.policyStatus).toBe("platform_invariant");
    expect(result.rationaleCode).toBe("FOUNDATION_ANONYMOUS_BUYER_B2C_CONTEXT");
  });

  it("does not derive B2B from taxNumber alone when customer is present", () => {
    const withTax = classifySaudiTaxInvoiceFoundation({
      buyerPresence: "present",
      customerType: "business",
      taxNumberPresent: true,
    });
    const withoutTax = classifySaudiTaxInvoiceFoundation({
      buyerPresence: "present",
      customerType: "individual",
      taxNumberPresent: false,
    });
    expect(withTax.partyModel).toBe("unclassified");
    expect(withoutTax.partyModel).toBe("unclassified");
    expect(withTax.invoiceForm).toBe("undetermined");
    expect(withoutTax.invoiceForm).toBe("undetermined");
    expect(withTax.policyStatus).toBe("needs_official_confirmation");
    expect(withoutTax.policyStatus).toBe("needs_official_confirmation");
  });

  it("does not treat missing taxNumber as non-tax invoice", () => {
    const result = classifySaudiTaxInvoiceFoundation({
      buyerPresence: "present",
      customerType: "individual",
      taxNumberPresent: false,
    });
    expect(result.rationaleCode).not.toMatch(/NON_TAX/i);
    expect(result.notes).toContain("does not decide B2B/B2C");
  });
});

describe("Saudi Tax Invoice state machine", () => {
  it("allows blocked_profile → generated and rejects generated → blocked_profile", () => {
    expect(canTransitionSaudiTaxInvoiceStatus("blocked_profile", "generated")).toBe(
      true
    );
    expect(canTransitionSaudiTaxInvoiceStatus("generated", "blocked_profile")).toBe(
      false
    );
    expect(canTransitionSaudiTaxInvoiceStatus("generated", "retryable")).toBe(false);
  });

  it("marks generated as snapshot-immutable", () => {
    expect(isSaudiTaxInvoiceSnapshotImmutable("generated")).toBe(true);
    expect(isSaudiTaxInvoiceSnapshotImmutable("blocked_profile")).toBe(false);
    expect(isSaudiTaxInvoiceSnapshotImmutable("retryable")).toBe(false);
  });
});
