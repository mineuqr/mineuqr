import { describe, expect, it } from "vitest";
import { computeCheckMoney } from "../checkMoney";
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

const multiExclusive: TaxPolicySnapshot = {
  version: 1,
  enabled: true,
  mode: "exclusive",
  components: [
    { id: "a", name: "A", ratePercent: "5.00" },
    { id: "b", name: "B", ratePercent: "10.00" },
  ],
};

describe("CHECK-MANAGEMENT-ARCHITECTURE-1 check money", () => {
  it("supports tax disabled (no VAT countries / businesses)", () => {
    const result = computeCheckMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: disabled,
    });
    expect(result.taxAmount).toBe("0.00");
    expect(result.grandTotal).toBe("100.00");
  });

  it("applies exclusive tax on taxable base", () => {
    const result = computeCheckMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: exclusive15,
    });
    expect(result.subtotal).toBe("100.00");
    expect(result.taxAmount).toBe("15.00");
    expect(result.grandTotal).toBe("115.00");
  });

  it("extracts inclusive tax from taxable base", () => {
    const result = computeCheckMoney({
      chargesSubtotal: "115.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: inclusive15,
    });
    expect(result.subtotal).toBe("115.00");
    expect(result.taxAmount).toBe("15.00");
    expect(result.grandTotal).toBe("115.00");
  });

  it("applies bill-level discount before tax", () => {
    const result = computeCheckMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "20.00",
      taxPolicySnapshot: exclusive15,
    });
    expect(result.subtotal).toBe("80.00");
    expect(result.taxAmount).toBe("12.00");
    expect(result.grandTotal).toBe("92.00");
  });

  it("supports multiple tax components without single-rate hard-code", () => {
    const result = computeCheckMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: multiExclusive,
    });
    expect(result.taxBreakdown.lines).toHaveLength(2);
    expect(result.taxAmount).toBe("15.00");
    expect(result.grandTotal).toBe("115.00");
  });
});
