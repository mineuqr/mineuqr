import { describe, expect, it } from "vitest";
import {
  displayCashChange,
  isCashReceivedSufficient,
} from "../cashierCashTender";

describe("cashier cash tender presentation", () => {
  it("allows confirmation only when received covers amount due", () => {
    expect(isCashReceivedSufficient("50.00", "47.00")).toBe(true);
    expect(isCashReceivedSufficient("47.00", "47.00")).toBe(true);
    expect(isCashReceivedSufficient("46.99", "47.00")).toBe(false);
    expect(displayCashChange("50.00", "47.00")).toBe("3.00");
    expect(displayCashChange("40.00", "47.00")).toBeNull();
  });
});
