/**
 * UNIFIED-POS-FINANCIAL-AUTHORITY-1 — Invoice Intent is not Collection Fact.
 */
import { describe, expect, it } from "vitest";
import { invoiceIntentIdForOrder } from "../InvoiceIntentService";

describe("InvoiceIntentService", () => {
  it("identifies intent per restaurant and order without a financial id", () => {
    expect(invoiceIntentIdForOrder(3, 44)).toBe("ii:3:44");
    expect(invoiceIntentIdForOrder(3, 44)).not.toContain("pcf");
    expect(invoiceIntentIdForOrder(3, 44)).not.toContain("paid");
  });
});
