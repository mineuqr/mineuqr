import { describe, expect, it } from "vitest";
import {
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
