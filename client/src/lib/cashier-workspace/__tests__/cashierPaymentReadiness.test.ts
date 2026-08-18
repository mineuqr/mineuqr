/**
 * CASHIER-PAYMENT-READINESS-STATE-HARDENING-1
 */
import { describe, expect, it } from "vitest";
import { resolveCashierPaymentReadiness } from "../cashierPaymentReadiness";

const idle = {
  intakePending: false,
  intakeFailed: false,
  paymentSubmitting: false,
};

describe("CASHIER-PAYMENT-READINESS-STATE-HARDENING-1", () => {
  it("shows preparing and disables Confirm Payment while Check due is unavailable", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: null,
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.checkAvailable).toBe(false);
    expect(view.showPreparingMessage).toBe(true);
    expect(view.confirmDisabled).toBe(true);
    expect(view.remainingDisplay).toBeNull();
    expect(view.totalTenderedDisplay).toBeNull();
    expect(view.amountDue).toBeNull();
  });

  it("does not treat remaining as 0.00 merely because Order cash was defaulted", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: undefined,
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.remainingDisplay).not.toBe("0.00");
    expect(view.canConfirmPayment).toBe(false);
  });

  it("does not let a stale Check-preparing intake flag block payment once outstandingAmount exists", () => {
    const view = resolveCashierPaymentReadiness({
      outstandingAmount: "10.00",
      cashTender: "10.00",
      cardTender: "",
      intakePending: true,
      intakeFailed: false,
      paymentSubmitting: false,
    });
    expect(view.checkAvailable).toBe(true);
    expect(view.showPreparingMessage).toBe(false);
    expect(view.amountDue).toBe("10.00");
    expect(view.canConfirmPayment).toBe(true);
    expect(view.confirmDisabled).toBe(false);
    expect(view.remainingDisplay).toBe("0.00");
    expect(view.totalTenderedDisplay).toBe("10.00");
  });

  it("enables Confirm Payment when outstandingAmount = 10, cash = 10, remaining = 0", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.confirmDisabled).toBe(false);
    expect(view.showPreparingMessage).toBe(false);
    expect(view.remainingDisplay).toBe("0.00");
  });

  it("disables Confirm Payment when cash is below Check due", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "6.00",
      cardTender: "",
    });
    expect(view.canConfirmPayment).toBe(false);
    expect(view.confirmDisabled).toBe(true);
    expect(view.remainingDisplay).toBe("4.00");
  });

  it("allows cash above Check due as presentation change", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "20.00",
      cardTender: "",
    });
    expect(view.canConfirmPayment).toBe(true);
    expect(view.confirmDisabled).toBe(false);
    expect(view.remainingDisplay).toBe("0.00");
    expect(view.totalTenderedDisplay).toBe("20.00");
  });

  it("enables Confirm Payment for card equal to Check due", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "",
      cardTender: "10.00",
    });
    expect(view.canConfirmPayment).toBe(true);
    expect(view.confirmDisabled).toBe(false);
    expect(view.showPreparingMessage).toBe(false);
  });

  it("transitions to payment-ready when Check due arrives after the initial render", () => {
    const before = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: null,
      cashTender: "10.00",
      cardTender: "",
    });
    const after = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "10.00",
      cardTender: "",
    });
    expect(before.showPreparingMessage).toBe(true);
    expect(before.confirmDisabled).toBe(true);
    expect(after.showPreparingMessage).toBe(false);
    expect(after.confirmDisabled).toBe(false);
  });

  it("keeps Confirm Payment disabled until Cash is defaulted to Check due", () => {
    const beforeTender = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "",
      cardTender: "",
    });
    const afterDefault = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "10.00",
      cardTender: "",
    });
    expect(beforeTender.canConfirmPayment).toBe(false);
    expect(beforeTender.remainingDisplay).toBe("10.00");
    expect(afterDefault.canConfirmPayment).toBe(true);
  });

  it("does not treat a cashier-entered tender as unpaid remaining when Check refreshes", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "15.00",
      cardTender: "",
    });
    expect(view.totalTenderedDisplay).toBe("15.00");
    expect(view.canConfirmPayment).toBe(true);
  });

  it("prevents duplicate Confirm Payment while settlement is submitting", () => {
    const view = resolveCashierPaymentReadiness({
      outstandingAmount: "10.00",
      cashTender: "10.00",
      cardTender: "",
      intakePending: false,
      intakeFailed: false,
      paymentSubmitting: true,
    });
    expect(view.canConfirmPayment).toBe(true);
    expect(view.confirmDisabled).toBe(true);
  });

  it("does not treat Check arrival as payment success", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      outstandingAmount: "10.00",
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.checkAvailable).toBe(true);
    expect(view.confirmDisabled).toBe(false);
  });

  it("stops infinite preparing when Check intake failed and due is still missing", () => {
    const view = resolveCashierPaymentReadiness({
      outstandingAmount: null,
      cashTender: "10.00",
      cardTender: "",
      intakePending: false,
      intakeFailed: true,
      paymentSubmitting: false,
    });
    expect(view.checkIntakeFailed).toBe(true);
    expect(view.showPreparingMessage).toBe(false);
    expect(view.confirmDisabled).toBe(true);
  });

  it("mandatory: valid Check + valid tender enables Confirm Payment and hides preparing", () => {
    const view = resolveCashierPaymentReadiness({
      outstandingAmount: "10.00",
      cashTender: "10.00",
      cardTender: "",
      intakePending: true,
      intakeFailed: false,
      paymentSubmitting: false,
    });
    expect(view.showPreparingMessage).toBe(false);
    expect(view.confirmDisabled).toBe(false);
  });
});
