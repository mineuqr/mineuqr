import { describe, expect, it } from "vitest";
import { cashierUiLabel } from "../cashierCopy";
import { newCashierIdempotencyKey } from "../cashierIdempotency";

describe("cashier presentation helpers", () => {
  it("keeps Cashier distinct from Register Ops in both languages", () => {
    expect(cashierUiLabel("title", "ar")).toBe("الكاشير");
    expect(cashierUiLabel("title", "en")).toBe("Cashier");
    expect(cashierUiLabel("subtitle", "en")).toContain("Register Ops");
    expect(cashierUiLabel("subtitle", "ar")).toContain("عمليات الصندوق");
    expect(cashierUiLabel("completePayment", "en")).toBe("Complete payment");
    expect(cashierUiLabel("openRegisterOps", "en")).toBe("Open Register Ops");
    expect(cashierUiLabel("checkOpenedResult", "ar")).toBe("الشيك مفتوح");
  });

  it("issues command idempotency keys in the existing POS length window", () => {
    const key = newCashierIdempotencyKey("sale");
    expect(key.startsWith("cashier-sale-")).toBe(true);
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(128);
    expect(newCashierIdempotencyKey("sale")).not.toBe(key);
  });
});
