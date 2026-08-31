/**
 * SAUDI-TAX-INVOICE-PHASE-1 — QR TLV + classification unit tests.
 */
import { describe, expect, it } from "vitest";
import {
  buildSaudiPhase1QrPayloadBase64,
  decodeSaudiPhase1QrPayloadBase64,
  classifySaudiTaxInvoiceFoundation,
  saudiPhase1InvoiceTitles,
  isSimplifiedTaxInvoiceForm,
} from "@shared/compliance";

describe("Saudi Phase 1 QR TLV (official tags 1–5)", () => {
  it("encodes and decodes seller/VAT/timestamp/totals without Phase 2 tags", () => {
    const payload = buildSaudiPhase1QrPayloadBase64({
      sellerName: "Bobs Records",
      sellerVatNumber: "310122393500003",
      timestampIso: "2022-04-25T15:30:00Z",
      invoiceTotalWithVat: "1000.00",
      vatTotal: "150.00",
    });
    const tags = decodeSaudiPhase1QrPayloadBase64(payload);
    expect(tags.map((t) => t.tag)).toEqual([1, 2, 3, 4, 5]);
    expect(tags[0]?.value).toBe("Bobs Records");
    expect(tags[1]?.value).toBe("310122393500003");
    expect(tags[2]?.value).toBe("2022-04-25T15:30:00Z");
    expect(tags[3]?.value).toBe("1000.00");
    expect(tags[4]?.value).toBe("150.00");
  });

  it("rejects missing seller VAT for QR", () => {
    expect(() =>
      buildSaudiPhase1QrPayloadBase64({
        sellerName: "Seller",
        sellerVatNumber: "",
        timestampIso: "2022-04-25T15:30:00Z",
        invoiceTotalWithVat: "10.00",
        vatTotal: "1.50",
      })
    ).toThrow(/VAT number/);
  });
});

describe("Saudi Phase 1 classification", () => {
  it("keeps anonymous cash as Simplified B2C", () => {
    const result = classifySaudiTaxInvoiceFoundation({
      buyerPresence: "absent",
      customerType: null,
      taxNumberPresent: false,
    });
    expect(result.invoiceForm).toBe("simplified_tax_invoice");
    expect(result.partyModel).toBe("b2c");
    expect(isSimplifiedTaxInvoiceForm(result.invoiceForm)).toBe(true);
  });

  it("does not use taxNumber alone for B2B", () => {
    const individualWithTax = classifySaudiTaxInvoiceFoundation({
      buyerPresence: "present",
      customerType: "individual",
      taxNumberPresent: true,
    });
    expect(individualWithTax.partyModel).not.toBe("b2b");
    expect(individualWithTax.invoiceForm).toBe("simplified_tax_invoice");
  });

  it("maps business + taxNumber to Tax Invoice without taxNumber-only rule", () => {
    const result = classifySaudiTaxInvoiceFoundation({
      buyerPresence: "present",
      customerType: "business",
      taxNumberPresent: true,
    });
    expect(result.partyModel).toBe("b2b");
    expect(result.invoiceForm).toBe("standard_tax_invoice");
    expect(saudiPhase1InvoiceTitles(result.invoiceForm).ar).toContain("فاتورة ضريبية");
    expect(saudiPhase1InvoiceTitles(result.invoiceForm).en).toBe("Tax Invoice");
  });

  it("keeps named individual without taxNumber as a tax invoice (Simplified)", () => {
    const result = classifySaudiTaxInvoiceFoundation({
      buyerPresence: "present",
      customerType: "individual",
      taxNumberPresent: false,
    });
    expect(result.invoiceForm).toBe("simplified_tax_invoice");
    expect(result.rationaleCode).not.toMatch(/NON_TAX/i);
  });
});
