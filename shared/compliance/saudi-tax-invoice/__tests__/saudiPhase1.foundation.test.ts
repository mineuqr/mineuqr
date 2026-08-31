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
  saudiPhase1QrRequired,
  SAUDI_PHASE_1_QR_POLICY,
  buildSaudiPhase1Document,
} from "@shared/compliance";
import type { SaudiTaxInvoice } from "@shared/compliance";

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

describe("SAUDI-TAX-INVOICE-PHASE-1-QR-UNIFICATION-1 policy", () => {
  it("requires Phase 1 QR for both Simplified and Standard (product policy)", () => {
    expect(SAUDI_PHASE_1_QR_POLICY).toBe("ALWAYS_FOR_TAX_INVOICES");
    expect(saudiPhase1QrRequired("simplified_tax_invoice")).toBe(true);
    expect(saudiPhase1QrRequired("standard_tax_invoice")).toBe(true);
    expect(saudiPhase1QrRequired("undetermined")).toBe(false);
  });

  it("persists qrRequired=true on both forms when building Phase 1 documents", () => {
    const baseInvoice = {
      id: 1,
      taxInvoiceId: "sti_1",
      restaurantId: 1,
      orderId: 1,
      collectionFactId: "cf_1",
      documentKind: "tax_invoice" as const,
      status: "generated" as const,
      partyModel: "b2c" as const,
      invoiceForm: "simplified_tax_invoice" as const,
      classification: {
        partyModel: "b2c" as const,
        invoiceForm: "simplified_tax_invoice" as const,
        rationaleCode: "test",
        policyStatus: "platform_invariant" as const,
        blockingIssues: [],
        notes: "",
      },
      sellerSnapshot: {
        kind: "ready" as const,
        profileId: 1,
        legalName: "Seller",
        vatRegistrationStatus: "registered",
        vatNumber: "300000000000003",
        registeredAddress: "Riyadh",
      },
      buyerSnapshot: {
        kind: "anonymous_cash" as const,
        customerId: null,
        displayName: null,
        customerType: null,
        phone: null,
        email: null,
        address: null,
        taxNumber: null,
      },
      linesSnapshot: {
        source: "order_items_plus_collection_fact_composition" as const,
        orderLines: [],
        collectionFactComposition: [],
        vatLineSsot: "deferred_oq_vat_1" as const,
      },
      monetarySnapshot: {
        source: "collection_fact" as const,
        subtotal: "10.00",
        discountAmount: "0.00",
        taxAmount: "1.50",
        amount: "11.50",
        currencyCode: "SAR",
        taxAmountMeaning: "collection_fact_copy_not_saudi_vat_engine" as const,
        oqVat1: "deferred" as const,
      },
      paymentSnapshot: {
        source: "collection_fact" as const,
        tenders: [{ paymentMethod: "cash", amount: "11.50" }],
      },
      sourceCustomerId: null,
      profileReadinessAtIssuance: "ready",
      failureCode: null,
      failureMessage: null,
      attemptCount: 1,
      issuedAt: "2026-09-01T00:00:00.000Z",
      invoiceNumber: null,
      invoiceSequence: null,
      issueTimestampIso: null,
      qrPayloadBase64: null,
      phase1Document: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    } satisfies SaudiTaxInvoice;

    const simplified = buildSaudiPhase1Document({
      taxInvoice: baseInvoice,
      invoiceNumber: "STI-1",
      issueTimestampIso: "2026-09-01T00:00:00.000Z",
      qrPayloadBase64: "QR-S",
    });
    expect(simplified.qrRequired).toBe(true);
    expect(simplified.qrPayloadBase64).toBe("QR-S");

    const standard = buildSaudiPhase1Document({
      taxInvoice: {
        ...baseInvoice,
        partyModel: "b2b",
        invoiceForm: "standard_tax_invoice",
        classification: {
          ...baseInvoice.classification,
          partyModel: "b2b",
          invoiceForm: "standard_tax_invoice",
        },
        buyerSnapshot: {
          kind: "customer",
          customerId: 2,
          displayName: "Biz",
          customerType: "business",
          phone: null,
          email: null,
          address: null,
          taxNumber: "300111111111113",
        },
      },
      invoiceNumber: "STI-2",
      issueTimestampIso: "2026-09-01T00:00:00.000Z",
      qrPayloadBase64: "QR-T",
    });
    expect(standard.qrRequired).toBe(true);
    expect(standard.qrPayloadBase64).toBe("QR-T");
    expect(standard.buyerVatNumberDisplayed).toBe("300111111111113");
  });
});
