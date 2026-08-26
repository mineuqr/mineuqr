import { describe, expect, it } from "vitest";
import { computeCheckMoney } from "../checkMoney";
import {
  cashierInvoicePresentationSubtotal,
  projectCashierSaleInvoiceMoney,
} from "../cashierSaleInvoiceMoney";
import type { TaxPolicySnapshot } from "../checkContract";

const exclusive15: TaxPolicySnapshot = {
  version: 1,
  enabled: true,
  mode: "exclusive",
  components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
};

const inclusive15: TaxPolicySnapshot = {
  version: 1,
  enabled: true,
  mode: "inclusive",
  components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
};

const disabled: TaxPolicySnapshot = {
  version: 1,
  enabled: false,
  mode: "exclusive",
  components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
};

describe("CASHIER-SALE-INVOICE-TAX-PROJECTION-1 presentation money", () => {
  it("maps inclusive 15% item 115 to Subtotal 100, VAT 15, Grand 115", () => {
    const engine = computeCheckMoney({
      chargesSubtotal: "115.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: inclusive15,
    });
    expect(engine.subtotal).toBe("115.00");
    expect(engine.grandTotal).toBe("115.00");
    const invoice = projectCashierSaleInvoiceMoney({
      chargesSubtotal: "115.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: inclusive15,
    });
    expect(invoice.itemValue).toBe("115.00");
    expect(invoice.subtotal).toBe("100.00");
    expect(invoice.taxAmount).toBe("15.00");
    expect(invoice.grandTotal).toBe("115.00");
    expect(invoice.grandTotal).not.toBe("130.00");
    expect(invoice.subtotal).not.toBe(engine.subtotal);
  });

  it("maps exclusive 15% item 100 to Subtotal 100, VAT 15, Grand 115", () => {
    const invoice = projectCashierSaleInvoiceMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: exclusive15,
    });
    expect(invoice.itemValue).toBe("100.00");
    expect(invoice.subtotal).toBe("100.00");
    expect(invoice.taxAmount).toBe("15.00");
    expect(invoice.grandTotal).toBe("115.00");
  });

  it("keeps VAT 0 and Grand Total as item value when tax is disabled", () => {
    const invoice = projectCashierSaleInvoiceMoney({
      chargesSubtotal: "115.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: disabled,
    });
    expect(invoice.taxAmount).toBe("0.00");
    expect(invoice.subtotal).toBe("115.00");
    expect(invoice.grandTotal).toBe("115.00");
  });

  it("keeps computeCheckMoney discount-before-tax ordering", () => {
    const engine = computeCheckMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "20.00",
      taxPolicySnapshot: exclusive15,
    });
    const invoice = projectCashierSaleInvoiceMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "20.00",
      taxPolicySnapshot: exclusive15,
    });
    expect(engine.taxAmount).toBe("12.00");
    expect(engine.grandTotal).toBe("92.00");
    expect(invoice.taxAmount).toBe(engine.taxAmount);
    expect(invoice.grandTotal).toBe(engine.grandTotal);
    expect(invoice.subtotal).toBe(
      cashierInvoicePresentationSubtotal(engine)
    );
    expect(invoice.subtotal).toBe("80.00");
  });
});
