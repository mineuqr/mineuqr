/**
 * ADR-ARCH-038 — Cashier Confirm readiness is commercial + tender + preview.
 * Preview grandTotal is not Check authority.
 */
import { describe, expect, it } from "vitest";
import { resolveCashierPaymentReadiness } from "../cashierPaymentReadiness";

const ready = {
  saleReady: true,
  paymentSubmitting: false,
};

describe("ADR-ARCH-038 cashier payment readiness", () => {
  it("disables Confirm until the sale is ready even with preview tender", () => {
    const view = resolveCashierPaymentReadiness({
      previewGrandTotal: "10.00",
      saleReady: false,
      cashTender: "10.00",
      cardTender: "",
      paymentSubmitting: false,
    });
    expect(view.canConfirmPayment).toBe(false);
    expect(view.confirmDisabled).toBe(true);
    expect(view.totalTenderedDisplay).toBe("10.00");
    expect(view.remainingDisplay).toBe("0.00");
    expect(view.showCardOverTender).toBe(false);
  });

  it("shows zero tendered while sale is not ready and tenders are empty", () => {
    const view = resolveCashierPaymentReadiness({
      previewGrandTotal: "10.00",
      saleReady: false,
      cashTender: "",
      cardTender: "",
      paymentSubmitting: false,
    });
    expect(view.totalTenderedDisplay).toBe("0.00");
    expect(view.remainingDisplay).toBe("10.00");
    expect(view.confirmDisabled).toBe(true);
    expect(view.showCardOverTender).toBe(false);
  });

  it("does not treat cash underpayment as a card error", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "6.00",
      cardTender: "",
    });
    expect(view.remainingDisplay).toBe("4.00");
    expect(view.canConfirmPayment).toBe(false);
    expect(view.showCardOverTender).toBe(false);
  });

  it("flags card over-tender as a card error while Confirm stays off", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "",
      cardTender: "11.00",
    });
    expect(view.remainingDisplay).toBe("0.00");
    expect(view.totalTenderedDisplay).toBe("11.00");
    expect(view.canConfirmPayment).toBe(false);
    expect(view.showCardOverTender).toBe(true);
  });

  it("still shows card over-tender while sale is not ready", () => {
    const view = resolveCashierPaymentReadiness({
      previewGrandTotal: "10.00",
      saleReady: false,
      cashTender: "",
      cardTender: "11.00",
      paymentSubmitting: false,
    });
    expect(view.confirmDisabled).toBe(true);
    expect(view.showCardOverTender).toBe(true);
  });

  it("flags unequal split tender as a card error", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "6.00",
      cardTender: "5.00",
    });
    expect(view.canConfirmPayment).toBe(false);
    expect(view.showCardOverTender).toBe(true);
  });

  it("does not flag a valid cash-plus-card split", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "6.00",
      cardTender: "4.00",
    });
    expect(view.canConfirmPayment).toBe(true);
    expect(view.showCardOverTender).toBe(false);
    expect(view.remainingDisplay).toBe("0.00");
  });

  it("does not enable Confirm from cash alone when preview is missing", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: null,
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.amountDue).toBeNull();
    expect(view.canConfirmPayment).toBe(false);
    expect(view.confirmDisabled).toBe(true);
  });

  it("enables Confirm when sale is ready, preview is 10, and cash is 10", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.confirmDisabled).toBe(false);
    expect(view.amountDue).toBe("10.00");
    expect(view.remainingDisplay).toBe("0.00");
  });

  it("disables Confirm when cash is below preview", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "6.00",
      cardTender: "",
    });
    expect(view.canConfirmPayment).toBe(false);
    expect(view.confirmDisabled).toBe(true);
  });

  it("allows cash above preview as presentation change", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "20.00",
      cardTender: "",
    });
    expect(view.canConfirmPayment).toBe(true);
    expect(view.totalTenderedDisplay).toBe("20.00");
  });

  it("enables Confirm for card equal to preview", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "",
      cardTender: "10.00",
    });
    expect(view.canConfirmPayment).toBe(true);
  });

  it("keeps Confirm disabled until tender matches preview", () => {
    const beforeTender = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "",
      cardTender: "",
    });
    const afterDefault = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "10.00",
      cardTender: "",
    });
    expect(beforeTender.canConfirmPayment).toBe(false);
    expect(afterDefault.canConfirmPayment).toBe(true);
  });

  it("prevents duplicate Confirm while settlement is submitting", () => {
    const view = resolveCashierPaymentReadiness({
      previewGrandTotal: "10.00",
      saleReady: true,
      cashTender: "10.00",
      cardTender: "",
      paymentSubmitting: true,
    });
    expect(view.canConfirmPayment).toBe(true);
    expect(view.confirmDisabled).toBe(true);
  });

  it("does not treat Order.totalAmount as payable when preview differs", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "11.50",
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.amountDue).toBe("11.50");
    expect(view.canConfirmPayment).toBe(false);
  });

  it("does not require an open Check to enable Confirm", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "10.00",
      cardTender: "",
    });
    expect(view.confirmDisabled).toBe(false);
    expect(view).not.toHaveProperty("checkAvailable");
  });

  it("enables complimentary Confirm without cash or card tender", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "10.00",
      cashTender: "",
      cardTender: "",
      complimentary: true,
    });
    expect(view.canConfirmPayment).toBe(true);
    expect(view.confirmDisabled).toBe(false);
    expect(view.remainingDisplay).toBe("0.00");
  });

  it("does not treat complimentary authorization as Confirm when the bill is empty", () => {
    const view = resolveCashierPaymentReadiness({
      ...ready,
      previewGrandTotal: "0.00",
      cashTender: "",
      cardTender: "",
      complimentary: true,
    });
    expect(view.canConfirmPayment).toBe(false);
  });
});
