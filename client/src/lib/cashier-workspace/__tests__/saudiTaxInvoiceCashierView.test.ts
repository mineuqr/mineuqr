/**
 * SAUDI-TAX-INVOICE-CASHIER-UX-1 — presentation mapper tests.
 */
import { describe, expect, it } from "vitest";
import type { SaudiPhase1Document } from "@shared/compliance";
import { mapSaudiPhase1DocumentToCashierView } from "../saudiTaxInvoiceCashierView";

function baseDoc(
  overrides: Partial<SaudiPhase1Document> = {}
): SaudiPhase1Document {
  return {
    schemaVersion: 1,
    programId: "SAUDI-TAX-INVOICE-PHASE-1",
    taxInvoiceId: "sti_test_1",
    invoiceNumber: "STI-0001",
    invoiceForm: "simplified_tax_invoice",
    titles: {
      ar: "فاتورة ضريبية مبسطة",
      en: "Simplified Tax Invoice",
    },
    issueTimestampIso: "2026-08-31T12:00:00.000Z",
    timezone: "Asia/Riyadh",
    qrRequired: true,
    qrPayloadBase64: "BASE64QR",
    seller: {
      kind: "ready",
      profileId: 1,
      legalName: "Seller Co",
      vatRegistrationStatus: "registered",
      vatNumber: "300000000000003",
      registeredAddress: "Riyadh",
    },
    buyer: {
      kind: "anonymous_cash",
      customerId: null,
      displayName: null,
      customerType: null,
      phone: null,
      email: null,
      address: null,
      taxNumber: null,
    },
    lines: {
      source: "order_items_plus_collection_fact_composition",
      orderLines: [
        {
          sourceOrderItemId: 1,
          menuItemId: 10,
          nameAr: "قهوة عربية فاخرة طويلة الاسم",
          nameEn: "Arabic coffee",
          quantity: 2,
          unitPrice: "10.00",
          lineAmount: "20.00",
          notes: null,
          modifiers: null,
        },
      ],
      collectionFactComposition: [],
      vatLineSsot: "deferred_oq_vat_1",
    },
    monetary: {
      source: "collection_fact",
      subtotal: "20.00",
      discountAmount: "0.00",
      taxAmount: "3.00",
      amount: "23.00",
      currencyCode: "SAR",
      taxAmountMeaning: "collection_fact_copy_not_saudi_vat_engine",
      oqVat1: "deferred",
    },
    payment: {
      source: "collection_fact",
      tenders: [{ paymentMethod: "cash", amount: "23.00" }],
    },
    taxSource: "collection_fact_monetary_snapshot",
    buyerVatNumberDisplayed: null,
    ...overrides,
  };
}

describe("mapSaudiPhase1DocumentToCashierView", () => {
  it("maps simplified anonymous cash without inventing a customer", () => {
    const view = mapSaudiPhase1DocumentToCashierView(baseDoc(), "generated");
    expect(view.invoiceNumber).toBe("STI-0001");
    expect(view.titleAr).toBe("فاتورة ضريبية مبسطة");
    expect(view.buyerLabelAr).toBe("نقدًا");
    expect(view.buyerVatNumber).toBeNull();
    expect(view.qrRequired).toBe(true);
    expect(view.qrPayloadBase64).toBe("BASE64QR");
    expect(view.subtotal).toBe("20.00");
    expect(view.taxAmount).toBe("3.00");
    expect(view.amount).toBe("23.00");
    expect(view.lines).toHaveLength(1);
  });

  it("maps standard tax invoice buyer VAT from document, not live customer", () => {
    const view = mapSaudiPhase1DocumentToCashierView(
      baseDoc({
        invoiceForm: "standard_tax_invoice",
        titles: { ar: "فاتورة ضريبية", en: "Tax Invoice" },
        qrRequired: false,
        qrPayloadBase64: null,
        buyer: {
          kind: "customer",
          customerId: 9,
          displayName: "شركة النور",
          customerType: "business",
          phone: null,
          email: null,
          address: null,
          taxNumber: "300111111111113",
        },
        buyerVatNumberDisplayed: "300111111111113",
      }),
      "generated"
    );
    expect(view.titleAr).toBe("فاتورة ضريبية");
    expect(view.buyerLabelAr).toBe("شركة النور");
    expect(view.buyerVatNumber).toBe("300111111111113");
    expect(view.qrRequired).toBe(false);
    expect(view.qrPayloadBase64).toBeNull();
  });
});
