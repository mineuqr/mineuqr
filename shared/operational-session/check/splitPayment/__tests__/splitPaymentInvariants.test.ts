import { describe, expect, it } from "vitest";
import { createSplitPayment } from "../splitPaymentCommands";
import {
  assertOutstandingInvariants,
  assertPaymentFinality,
  assertPaymentIdentityStable,
  assertPaymentRespectsOutstanding,
  assertSplitPaymentValid,
} from "../splitPaymentInvariants";
import {
  FinalityViolationError,
  IdentityViolationError,
  PaymentExceedsOutstandingError,
} from "../splitPaymentErrors";
import {
  assertPaymentId,
  assertPaymentReference,
} from "../splitPaymentIdentity";

const AT = "2026-07-23T00:00:00.000Z";

describe("splitPaymentInvariants", () => {
  it("validates created Payment", () => {
    const { payment } = createSplitPayment({
      restaurantId: 1,
      checkId: 1,
      paymentId: "pay_inv",
      paymentReference: "pref_inv",
      amount: "10.00",
      checkRestaurantId: 1,
      outstandingBalance: "10.00",
      at: AT,
    });
    assertSplitPaymentValid(payment);
    assertPaymentFinality(payment);
  });

  it("enforces outstanding conservation snapshot", () => {
    assertOutstandingInvariants({
      restaurantId: 1,
      checkId: 1,
      financialResponsibility: "90.00",
      appliedPaymentValue: "30.00",
      outstandingBalance: "60.00",
    });
  });

  it("rejects payment above outstanding", () => {
    expect(() =>
      assertPaymentRespectsOutstanding("40.00", "39.99")
    ).toThrow(PaymentExceedsOutstandingError);
  });

  it("rejects transport-like PaymentId", () => {
    expect(() => assertPaymentId("evt_123")).toThrow(IdentityViolationError);
    expect(() => assertPaymentReference("transport:x")).toThrow(
      IdentityViolationError
    );
  });

  it("detects identity mutation", () => {
    const { payment } = createSplitPayment({
      restaurantId: 1,
      checkId: 1,
      paymentId: "pay_stable",
      paymentReference: "pref_stable",
      financialReference: "fref",
      amount: "5.00",
      checkRestaurantId: 1,
      outstandingBalance: "5.00",
      at: AT,
    });
    expect(() =>
      assertPaymentIdentityStable(payment, {
        ...payment,
        paymentId: "pay_changed",
      })
    ).toThrow(IdentityViolationError);
  });

  it("finality flag must remain false", () => {
    const { payment } = createSplitPayment({
      restaurantId: 1,
      checkId: 1,
      paymentId: "pay_fin",
      paymentReference: "pref_fin",
      amount: "5.00",
      checkRestaurantId: 1,
      outstandingBalance: "5.00",
      at: AT,
    });
    expect(() =>
      assertPaymentFinality({
        ...payment,
        impliesFinancialSettlement: true as false,
      })
    ).toThrow(FinalityViolationError);
  });
});
