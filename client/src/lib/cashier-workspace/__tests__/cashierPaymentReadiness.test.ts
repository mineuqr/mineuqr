/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1 / CASHIER-PAYMENT-READINESS-STATE-HARDENING-1
 */
import { describe, expect, it } from "vitest";
import { resolveCashierPaymentReadiness } from "../cashierPaymentReadiness";

const idle = {
  intakePending: false,
  intakeFailed: false,
  paymentSubmitting: false,
};

function openCheck(grandTotal: string | null) {
  return {
    ...idle,
    checkGrandTotal: grandTotal,
    checkOutcome: grandTotal == null ? null : "open",
  };
}

describe("CASHIER-POS-CHECK-READ-CONTRACT-1 payment readiness", () => {
  it("shows preparing and disables Confirm Payment while Check is unavailable", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      checkGrandTotal: null,
      checkOutcome: null,
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.checkAvailable).toBe(false);
    expect(view.showPreparingMessage).toBe(true);
    expect(view.confirmDisabled).toBe(true);
    expect(view.remainingDisplay).toBeNull();
    expect(view.amountDue).toBeNull();
  });

  it("does not treat Order-defaulted cash 10.00 as Check due", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      checkGrandTotal: null,
      checkOutcome: null,
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.remainingDisplay).not.toBe("0.00");
    expect(view.canConfirmPayment).toBe(false);
  });

  it("does not let a stale intake-pending flag block an open Check", () => {
    const view = resolveCashierPaymentReadiness({
      checkGrandTotal: "10.00",
      checkOutcome: "open",
      cashTender: "10.00",
      cardTender: "",
      intakePending: true,
      intakeFailed: false,
      paymentSubmitting: false,
    });
    expect(view.checkAvailable).toBe(true);
    expect(view.showPreparingMessage).toBe(false);
    expect(view.confirmDisabled).toBe(false);
  });

  it("enables Confirm Payment when Check.grandTotal = 10 and cash = 10", () => {
    const view = resolveCashierPaymentReadiness({
      ...openCheck("10.00"),
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.confirmDisabled).toBe(false);
    expect(view.showPreparingMessage).toBe(false);
    expect(view.remainingDisplay).toBe("0.00");
  });

  it("disables Confirm Payment when cash is below Check.grandTotal", () => {
    const view = resolveCashierPaymentReadiness({
      ...openCheck("10.00"),
      cashTender: "6.00",
      cardTender: "",
    });
    expect(view.canConfirmPayment).toBe(false);
    expect(view.confirmDisabled).toBe(true);
  });

  it("allows cash above Check.grandTotal as presentation change", () => {
    const view = resolveCashierPaymentReadiness({
      ...openCheck("10.00"),
      cashTender: "20.00",
      cardTender: "",
    });
    expect(view.canConfirmPayment).toBe(true);
    expect(view.totalTenderedDisplay).toBe("20.00");
  });

  it("enables Confirm Payment for card equal to Check.grandTotal", () => {
    const view = resolveCashierPaymentReadiness({
      ...openCheck("10.00"),
      cashTender: "",
      cardTender: "10.00",
    });
    expect(view.canConfirmPayment).toBe(true);
  });

  it("transitions to payment-ready when an open Check arrives after the initial render", () => {
    const before = resolveCashierPaymentReadiness({
      ...idle,
      checkGrandTotal: null,
      checkOutcome: null,
      cashTender: "10.00",
      cardTender: "",
    });
    const after = resolveCashierPaymentReadiness({
      ...openCheck("10.00"),
      cashTender: "10.00",
      cardTender: "",
    });
    expect(before.showPreparingMessage).toBe(true);
    expect(after.showPreparingMessage).toBe(false);
    expect(after.confirmDisabled).toBe(false);
  });

  it("keeps Confirm Payment disabled until cash is defaulted to Check.grandTotal", () => {
    const beforeTender = resolveCashierPaymentReadiness({
      ...openCheck("10.00"),
      cashTender: "",
      cardTender: "",
    });
    const afterDefault = resolveCashierPaymentReadiness({
      ...openCheck("10.00"),
      cashTender: "10.00",
      cardTender: "",
    });
    expect(beforeTender.canConfirmPayment).toBe(false);
    expect(afterDefault.canConfirmPayment).toBe(true);
  });

  it("preserves a cashier-entered tender when Check.grandTotal is already available", () => {
    const view = resolveCashierPaymentReadiness({
      ...openCheck("10.00"),
      cashTender: "15.00",
      cardTender: "",
    });
    expect(view.totalTenderedDisplay).toBe("15.00");
    expect(view.canConfirmPayment).toBe(true);
  });

  it("prevents duplicate Confirm Payment while settlement is submitting", () => {
    const view = resolveCashierPaymentReadiness({
      checkGrandTotal: "10.00",
      checkOutcome: "open",
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
      ...openCheck("10.00"),
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.checkAvailable).toBe(true);
    expect(view.confirmDisabled).toBe(false);
  });

  it("stops infinite preparing when Check intake failed and Check is still missing", () => {
    const view = resolveCashierPaymentReadiness({
      checkGrandTotal: null,
      checkOutcome: null,
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

  it("does not enable payment from Order.totalAmount when Check.grandTotal differs", () => {
    const view = resolveCashierPaymentReadiness({
      ...openCheck("11.50"),
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.amountDue).toBe("11.50");
    expect(view.canConfirmPayment).toBe(false);
    expect(view.confirmDisabled).toBe(true);
  });

  it("enables payment against Check.grandTotal, not Order.totalAmount, in a tax scenario", () => {
    const view = resolveCashierPaymentReadiness({
      ...openCheck("11.50"),
      cashTender: "11.50",
      cardTender: "",
    });
    expect(view.amountDue).toBe("11.50");
    expect(view.canConfirmPayment).toBe(true);
    expect(view.confirmDisabled).toBe(false);
  });

  it("does not treat a terminal Check as payable", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      checkGrandTotal: "11.50",
      checkOutcome: "paid",
      cashTender: "11.50",
      cardTender: "",
    });
    expect(view.checkAvailable).toBe(false);
    expect(view.checkTerminal).toBe(true);
    expect(view.showPreparingMessage).toBe(false);
    expect(view.confirmDisabled).toBe(true);
  });

  it("fails closed on Check read error without a false preparing state", () => {
    const view = resolveCashierPaymentReadiness({
      ...idle,
      checkGrandTotal: null,
      checkOutcome: null,
      cashTender: "10.00",
      cardTender: "",
      checkReadFailed: true,
    });
    expect(view.checkAvailable).toBe(false);
    expect(view.checkReadFailed).toBe(true);
    expect(view.showPreparingMessage).toBe(false);
    expect(view.confirmDisabled).toBe(true);
  });

  it("mandatory: open Check + valid tender enables Confirm Payment and hides preparing", () => {
    const view = resolveCashierPaymentReadiness({
      checkGrandTotal: "10.00",
      checkOutcome: "open",
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
