import { describe, expect, it } from "vitest";
import {
  displayMoneyTimesQuantity,
  displayTicketTotal,
  isPositiveDisplayMoney,
} from "../cashierTicketTotals";

describe("cashier ticket display totals", () => {
  it("multiplies catalog decimal strings without inventing a revenue store", () => {
    expect(displayMoneyTimesQuantity("12.50", 2)).toBe("25.00");
    expect(displayMoneyTimesQuantity("4", 3)).toBe("12.00");
    expect(displayTicketTotal([
      { price: "12.50", quantity: 2 },
      { price: "4.00", quantity: 1 },
    ])).toBe("29.00");
  });

  it("returns null when a line is not a catalog decimal", () => {
    expect(displayTicketTotal([{ price: "n/a", quantity: 1 }])).toBeNull();
  });

  it("treats catalog-decimal display helpers as non-authoritative", () => {
    expect(isPositiveDisplayMoney("0.00")).toBe(false);
    expect(isPositiveDisplayMoney("2.00")).toBe(true);
    expect(isPositiveDisplayMoney("n/a")).toBe(false);
  });
});
