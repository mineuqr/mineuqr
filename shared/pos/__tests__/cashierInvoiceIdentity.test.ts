import { describe, expect, it } from "vitest";
import { formatCashierInvoiceNumber } from "../cashierInvoiceIdentity";

describe("formatCashierInvoiceNumber", () => {
  it("pads a continuous Cashier-owned sequence to six digits", () => {
    expect(formatCashierInvoiceNumber(1)).toBe("000001");
    expect(formatCashierInvoiceNumber(2)).toBe("000002");
    expect(formatCashierInvoiceNumber(126)).toBe("000126");
    expect(formatCashierInvoiceNumber(1250)).toBe("001250");
    expect(formatCashierInvoiceNumber(1251)).toBe("001251");
  });

  it("rejects values that are not a positive integer sequence", () => {
    expect(formatCashierInvoiceNumber(0)).toBe("");
    expect(formatCashierInvoiceNumber(-1)).toBe("");
    expect(formatCashierInvoiceNumber(1.5)).toBe("");
    expect(formatCashierInvoiceNumber(Number.NaN)).toBe("");
  });
});
