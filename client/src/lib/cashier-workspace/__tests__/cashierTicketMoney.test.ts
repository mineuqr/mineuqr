import { describe, expect, it } from "vitest";
import { projectCashierSaleInvoiceMoney } from "@shared/operational-session";
import {
  cashierDiscountExceedsCatalogSubtotal,
  cashierDisplayTaxPolicy,
  clampCashierDiscountAmount,
  displayCashierTicketMoney,
} from "../cashierTicketMoney";

const exclusive15 = cashierDisplayTaxPolicy({
  taxEnabled: true,
  taxMode: "exclusive",
  taxPolicyJson: JSON.stringify({
    version: 1,
    components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
  }),
});

const inclusive15 = cashierDisplayTaxPolicy({
  taxEnabled: true,
  taxMode: "inclusive",
  taxPolicyJson: JSON.stringify({
    version: 1,
    components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
  }),
});

const disabled = cashierDisplayTaxPolicy({
  taxEnabled: false,
  taxMode: "exclusive",
  taxPolicyJson: JSON.stringify({
    version: 1,
    components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
  }),
});

describe("CASHIER-PAYMENT-FLOW-UX-CORRECTION-1 ticket display money", () => {
  it("shows exclusive tax immediately from catalog subtotal", () => {
    const money = displayCashierTicketMoney({
      catalogSubtotal: "10.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: exclusive15,
    });
    expect(money?.subtotal).toBe("10.00");
    expect(money?.taxAmount).toBe("1.50");
    expect(money?.grandTotal).toBe("11.50");
  });

  it("extracts inclusive tax and keeps grand total as the catalog base", () => {
    const money = displayCashierTicketMoney({
      catalogSubtotal: "10.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: inclusive15,
    });
    expect(money?.taxAmount).toBe("1.30");
    expect(money?.grandTotal).toBe("10.00");
  });

  it("applies bill discount before tax using computeCheckMoney", () => {
    const money = displayCashierTicketMoney({
      catalogSubtotal: "100.00",
      billDiscountAmount: "20.00",
      taxPolicySnapshot: exclusive15,
    });
    expect(money?.subtotal).toBe("80.00");
    expect(money?.taxAmount).toBe("12.00");
    expect(money?.grandTotal).toBe("92.00");
  });

  it("shows zero tax when the restaurant policy is disabled", () => {
    const money = displayCashierTicketMoney({
      catalogSubtotal: "10.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: disabled,
    });
    expect(money?.taxAmount).toBe("0.00");
    expect(money?.grandTotal).toBe("10.00");
  });

  it("clamps discount to the catalog subtotal", () => {
    expect(clampCashierDiscountAmount("25.00", "10.00")).toBe("10.00");
    expect(clampCashierDiscountAmount("n/a", "10.00")).toBe("0.00");
  });
});

describe("CASHIER-DISCOUNT-NORMALIZATION-FALSE-POSITIVE-FIX-1", () => {
  const catalog = "35.00";

  it("normalizes valid drafts to cents without treating them as overflow", () => {
    for (const draft of ["2", "2.0", "02.00", "2.00"] as const) {
      expect(cashierDiscountExceedsCatalogSubtotal(draft, catalog)).toBe(false);
      expect(clampCashierDiscountAmount(draft, catalog)).toBe("2.00");
    }
  });

  it("accepts discount equal to the catalog/charges cap", () => {
    expect(cashierDiscountExceedsCatalogSubtotal("35.00", catalog)).toBe(false);
    expect(clampCashierDiscountAmount("35.00", catalog)).toBe("35.00");
  });

  it("flags numeric overflow against catalog/charges, then clamps", () => {
    expect(cashierDiscountExceedsCatalogSubtotal("35.01", catalog)).toBe(true);
    expect(clampCashierDiscountAmount("35.01", catalog)).toBe("35.00");
    expect(cashierDiscountExceedsCatalogSubtotal("40.00", catalog)).toBe(true);
    expect(clampCashierDiscountAmount("40.00", catalog)).toBe("35.00");
    expect(cashierDiscountExceedsCatalogSubtotal("40", catalog)).toBe(true);
    expect(clampCashierDiscountAmount("40", catalog)).toBe("35.00");
  });

  it("does not treat invalid input as overflow", () => {
    expect(cashierDiscountExceedsCatalogSubtotal("n/a", catalog)).toBe(false);
    expect(clampCashierDiscountAmount("n/a", catalog)).toBe("0.00");
  });

  it("keeps catalog/charges as the cap, not presentation Subtotal", () => {
    const invoice = projectCashierSaleInvoiceMoney({
      chargesSubtotal: catalog,
      billDiscountAmount: "2.00",
      taxPolicySnapshot: inclusive15,
    });
    expect(invoice.subtotal).toBe("28.70");
    expect(invoice.taxAmount).toBe("4.30");
    expect(invoice.grandTotal).toBe("33.00");
    expect(cashierDiscountExceedsCatalogSubtotal("2.00", catalog)).toBe(false);
    expect(
      cashierDiscountExceedsCatalogSubtotal("2.00", invoice.subtotal)
    ).toBe(false);
    expect(cashierDiscountExceedsCatalogSubtotal("30.00", catalog)).toBe(false);
    expect(
      cashierDiscountExceedsCatalogSubtotal("30.00", invoice.subtotal)
    ).toBe(true);
  });
});
