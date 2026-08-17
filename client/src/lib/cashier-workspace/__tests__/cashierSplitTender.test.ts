import { describe, expect, it } from "vitest";
import {
  canConfirmCashierSettlement,
  displayCents,
  resolveCashierSettlementPlan,
} from "../cashierSplitTender";

describe("cashier split tender presentation", () => {
  it("confirms cash 6 + card 4 against a 10.00 Check", () => {
    const draft = {
      amountDue: "10.00",
      cashTender: "6.00",
      cardTender: "4.00",
    };
    expect(canConfirmCashierSettlement(draft)).toBe(true);
    expect(resolveCashierSettlementPlan(draft)).toMatchObject({
      paymentMethod: "cash",
      remainingCents: 0,
      changeCents: 0,
      settlements: [
        { paymentMethod: "cash", amount: "6.00" },
        { paymentMethod: "card", amount: "4.00" },
      ],
    });
  });

  it("blocks underpayment while 4.00 remains", () => {
    const draft = {
      amountDue: "10.00",
      cashTender: "6.00",
      cardTender: "",
    };
    expect(canConfirmCashierSettlement(draft)).toBe(false);
    expect(resolveCashierSettlementPlan(draft)?.remainingCents).toBe(400);
    expect(displayCents(400)).toBe("4.00");
  });

  it("treats cash over-tender as presentation change and settles the due amount", () => {
    const draft = {
      amountDue: "10.00",
      cashTender: "20.00",
      cardTender: "",
    };
    expect(canConfirmCashierSettlement(draft)).toBe(true);
    expect(resolveCashierSettlementPlan(draft)).toMatchObject({
      paymentMethod: "cash",
      remainingCents: 0,
      changeCents: 1000,
      settlements: [{ paymentMethod: "cash" }],
    });
  });

  it("rejects card over-tender because change is cash-only", () => {
    expect(
      canConfirmCashierSettlement({
        amountDue: "10.00",
        cashTender: "",
        cardTender: "11.00",
      })
    ).toBe(false);
  });

  it("rejects a split that does not equal the Check grandTotal", () => {
    expect(
      canConfirmCashierSettlement({
        amountDue: "10.00",
        cashTender: "6.00",
        cardTender: "5.00",
      })
    ).toBe(false);
  });
});
