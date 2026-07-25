import { describe, expect, it } from "vitest";
import {
  CANONICAL_MONETARY_PAYMENT_METHODS,
  SELECTABLE_PAYMENT_METHODS,
  isMonetaryPaymentMethod,
  paymentMethodCategory,
  toCanonicalPaymentMethod,
} from "../paymentMethod";

describe("PAYMENT-METHOD-CATALOG-UNIFICATION-1", () => {
  it("exposes one canonical monetary catalog", () => {
    expect([...CANONICAL_MONETARY_PAYMENT_METHODS]).toEqual([
      "cash",
      "card",
      "other",
    ]);
    expect([...SELECTABLE_PAYMENT_METHODS]).toEqual(["cash", "card"]);
  });

  it("maps legacy electronic brands to card without changing cash/other", () => {
    expect(toCanonicalPaymentMethod("cash")).toBe("cash");
    expect(toCanonicalPaymentMethod("card")).toBe("card");
    expect(toCanonicalPaymentMethod("other")).toBe("other");
    expect(toCanonicalPaymentMethod("complimentary")).toBe("complimentary");
    for (const legacy of [
      "mada",
      "visa",
      "mastercard",
      "apple_pay",
      "stc_pay",
      "bank_transfer",
    ]) {
      expect(toCanonicalPaymentMethod(legacy)).toBe("card");
      expect(paymentMethodCategory(legacy)).toBe("card");
      expect(isMonetaryPaymentMethod(legacy)).toBe(true);
    }
  });
});
