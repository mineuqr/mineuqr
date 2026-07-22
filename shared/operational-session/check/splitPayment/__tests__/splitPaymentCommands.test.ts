import { describe, expect, it } from "vitest";
import {
  allocatePayment,
  allocateTenders,
  authorizePayment,
  cancelPayment,
  capturePayment,
  createSplitPayment,
  failPayment,
  failPaymentAttempt,
  refundPayment,
  startPaymentAttempt,
  succeedPaymentAttempt,
  updateOutstandingSnapshot,
  voidPayment,
} from "../splitPaymentCommands";
import {
  FinalityViolationError,
  IllegalTerminalTransitionError,
  InvalidPaymentStateError,
  PaymentAlreadyCompletedError,
  PaymentExceedsOutstandingError,
} from "../splitPaymentErrors";
import { assertIdentityUnchanged } from "../splitPaymentIdentity";
import { assertPaymentFinality } from "../splitPaymentInvariants";
import { assertTransitionAllowed } from "../splitPaymentLifecycle";

const AT = "2026-07-23T00:00:00.000Z";

function createPending(overrides: Partial<Parameters<typeof createSplitPayment>[0]> = {}) {
  return createSplitPayment({
    restaurantId: 1,
    checkId: 10,
    paymentId: "pay_1",
    paymentReference: "pref_1",
    financialReference: "fref_1",
    amount: "100.00",
    checkRestaurantId: 1,
    outstandingBalance: "100.00",
    at: AT,
    ...overrides,
  });
}

describe("splitPaymentCommands lifecycle", () => {
  it("creates pending Payment with stable identities", () => {
    const r = createPending();
    expect(r.outcome).toBe("applied");
    expect(r.payment.status).toBe("pending");
    expect(r.payment.impliesFinancialSettlement).toBe(false);
    expect(r.events.map((e) => e.eventType)).toContain("PaymentCreated");
  });

  it("authorizes then captures", () => {
    let p = createPending().payment;
    const auth = authorizePayment({ payment: p, at: AT });
    expect(auth.outcome).toBe("applied");
    expect(auth.payment.status).toBe("authorized");
    p = auth.payment;
    const cap = capturePayment({
      payment: p,
      outstandingBalance: "100.00",
      at: AT,
      tenders: [{ tenderId: "t1", method: "visa", amount: "100.00" }],
    });
    expect(cap.payment.status).toBe("captured");
    expect(cap.payment.paymentId).toBe("pay_1");
    assertIdentityUnchanged(p, cap.payment);
  });

  it("idempotent authorize / capture / cancel", () => {
    const p = authorizePayment({
      payment: createPending().payment,
      at: AT,
    }).payment;
    expect(authorizePayment({ payment: p, at: AT }).outcome).toBe(
      "already_applied"
    );
    const captured = capturePayment({
      payment: p,
      outstandingBalance: "100.00",
      at: AT,
    }).payment;
    expect(
      capturePayment({
        payment: captured,
        outstandingBalance: "100.00",
        at: AT,
      }).outcome
    ).toBe("already_applied");

    const cancelled = cancelPayment({
      payment: createPending().payment,
      at: AT,
    }).payment;
    expect(cancelPayment({ payment: cancelled, at: AT }).outcome).toBe(
      "already_applied"
    );
  });

  it("rejects capture exceeding outstanding", () => {
    const p = createPending({ amount: "80.00" }).payment;
    expect(() =>
      capturePayment({
        payment: p,
        outstandingBalance: "50.00",
        at: AT,
      })
    ).toThrow(PaymentExceedsOutstandingError);
  });

  it("fails pending Payment; cannot reopen", () => {
    const failed = failPayment({
      payment: createPending().payment,
      at: AT,
    }).payment;
    expect(failed.status).toBe("failed");
    expect(() =>
      assertTransitionAllowed("failed", "pending")
    ).toThrow(IllegalTerminalTransitionError);
  });
});

describe("splitPaymentCommands allocation", () => {
  function capturedPayment(amount = "100.00") {
    const created = createPending({
      amount,
      initialStatus: "captured",
      tenders: [
        { tenderId: "t_cash", method: "cash", amount: "40.00" },
        { tenderId: "t_visa", method: "visa", amount: "60.00" },
      ],
    });
    return created.payment;
  }

  it("supports split / partial then full allocation", () => {
    let p = capturedPayment();
    const partial = allocatePayment({
      payment: p,
      portions: [
        { portionId: "po1", paymentId: "pay_1", amount: "40.00", orderId: 1 },
      ],
      allocationIds: ["alloc_1"],
      at: AT,
    });
    expect(partial.outcome).toBe("applied");
    expect(partial.payment.status).toBe("partially_applied");
    expect(partial.payment.allocatedAmount).toBe("40.00");
    expect(partial.payment.unallocatedAmount).toBe("60.00");
    expect(partial.events.some((e) => e.eventType === "PaymentPartiallyApplied")).toBe(
      true
    );

    p = partial.payment;
    const full = allocatePayment({
      payment: p,
      portions: [
        { portionId: "po2", paymentId: "pay_1", amount: "60.00", orderId: 2 },
      ],
      allocationIds: ["alloc_2"],
      at: AT,
    });
    expect(full.payment.status).toBe("applied");
    expect(full.payment.unallocatedAmount).toBe("0.00");
    expect(full.events.some((e) => e.eventType === "PaymentApplied")).toBe(true);
    expect(full.events.some((e) => e.eventType === "PaymentCompleted")).toBe(
      true
    );
    const completed = full.events.find((e) => e.eventType === "PaymentCompleted");
    expect(completed).toMatchObject({ impliesFinancialSettlement: false });
  });

  it("supports mixed tenders and tender allocations", () => {
    const p = capturedPayment();
    const r = allocateTenders({
      payment: p,
      allocations: [
        { tenderAllocationId: "ta1", tenderId: "t_cash", amount: "40.00" },
        { tenderAllocationId: "ta2", tenderId: "t_visa", amount: "60.00" },
      ],
      at: AT,
    });
    expect(r.outcome).toBe("applied");
    expect(r.payment.tenderAllocations).toHaveLength(2);
    expect(r.events.every((e) => e.eventType === "TenderAllocated")).toBe(true);
  });

  it("Payment completion never implies financial settlement", () => {
    const paid = createPending({
      paymentId: "pay_2",
      paymentReference: "pref_2",
      amount: "50.00",
      initialStatus: "captured",
      tenders: [{ tenderId: "t1", method: "cash", amount: "50.00" }],
    }).payment;
    const r = allocatePayment({
      payment: paid,
      portions: [
        { portionId: "po", paymentId: "pay_2", amount: "50.00", orderId: 9 },
      ],
      allocationIds: ["a1"],
      at: AT,
    });
    expect(r.payment.impliesFinancialSettlement).toBe(false);
    expect(r.payment.status).toBe("applied");
  });

  it("void / refund / cancel rules", () => {
    const pending = createPending().payment;
    expect(cancelPayment({ payment: pending, at: AT }).payment.status).toBe(
      "cancelled"
    );

    const auth = authorizePayment({ payment: createPending().payment, at: AT })
      .payment;
    expect(voidPayment({ payment: auth, at: AT }).payment.status).toBe("voided");

    const captured = capturePayment({
      payment: createPending().payment,
      outstandingBalance: "100.00",
      at: AT,
    }).payment;
    expect(refundPayment({ payment: captured, at: AT }).payment.status).toBe(
      "refunded"
    );

    const applied = allocatePayment({
      payment: createPending({
        paymentId: "pay_x",
        paymentReference: "pref_x",
        initialStatus: "captured",
        tenders: [{ tenderId: "t", method: "cash", amount: "100.00" }],
      }).payment,
      portions: [
        { portionId: "p", paymentId: "pay_x", amount: "100.00", orderId: 1 },
      ],
      allocationIds: ["ax"],
      at: AT,
    }).payment;
    expect(() => voidPayment({ payment: applied, at: AT })).toThrow(
      PaymentAlreadyCompletedError
    );
    expect(refundPayment({ payment: applied, at: AT }).payment.status).toBe(
      "refunded"
    );
  });
});

describe("splitPaymentCommands attempts + outstanding", () => {
  it("PaymentAttempt has independent id, binds parent Payment on success", () => {
    const started = startPaymentAttempt({
      restaurantId: 1,
      checkId: 10,
      attemptId: "att_1",
      amount: "25.00",
      method: "mada",
      at: AT,
    });
    expect(started.attempt.attemptId).toBe("att_1");
    expect(started.attempt.paymentId).toBeNull();

    const payment = createPending({
      paymentId: "pay_att",
      paymentReference: "pref_att",
      amount: "25.00",
      initialStatus: "captured",
      tenders: [{ tenderId: "t", method: "mada", amount: "25.00" }],
    }).payment;

    const ok = succeedPaymentAttempt({
      attempt: started.attempt,
      payment,
      at: AT,
    });
    expect(ok.attempt.paymentId).toBe("pay_att");
    expect(ok.attempt.attemptId).toBe("att_1");
    expect(ok.payment?.paymentId).toBe("pay_att");
  });

  it("failed attempt does not create Payment side-effects", () => {
    const started = startPaymentAttempt({
      restaurantId: 1,
      checkId: 10,
      attemptId: "att_fail",
      amount: "10.00",
      method: "visa",
      at: AT,
    });
    const failed = failPaymentAttempt({ attempt: started.attempt, at: AT });
    expect(failed.payment).toBeNull();
    expect(failed.attempt.status).toBe("failed");
  });

  it("updates outstanding snapshot with conservation", () => {
    const r = updateOutstandingSnapshot({
      restaurantId: 1,
      checkId: 10,
      financialResponsibility: "200.00",
      appliedPaymentValue: "75.00",
      paymentId: "pay_1",
      at: AT,
    });
    expect(r.responsibility.outstandingBalance).toBe("125.00");
    expect(r.events[0]?.eventType).toBe("OutstandingUpdated");
  });

  it("rejects allocate before capture", () => {
    const p = createPending().payment;
    expect(() =>
      allocatePayment({
        payment: p,
        portions: [
          { portionId: "x", paymentId: "pay_1", amount: "10.00", orderId: 1 },
        ],
        allocationIds: ["a"],
        at: AT,
      })
    ).toThrow(InvalidPaymentStateError);
  });
});

describe("splitPaymentCommands identity + finality", () => {
  it("identity never changes across lifecycle", () => {
    let p = createPending().payment;
    const ids = {
      paymentId: p.paymentId,
      paymentReference: p.paymentReference,
      financialReference: p.financialReference,
    };
    p = authorizePayment({ payment: p, at: AT }).payment;
    p = capturePayment({
      payment: p,
      outstandingBalance: "100.00",
      at: AT,
    }).payment;
    p = allocatePayment({
      payment: p,
      portions: [
        { portionId: "a", paymentId: "pay_1", amount: "100.00", orderId: 1 },
      ],
      allocationIds: ["alloc"],
      at: AT,
    }).payment;
    p = refundPayment({ payment: p, at: AT }).payment;
    expect(p.paymentId).toBe(ids.paymentId);
    expect(p.paymentReference).toBe(ids.paymentReference);
    expect(p.financialReference).toBe(ids.financialReference);
  });

  it("FinalityViolation if impliesFinancialSettlement forced true", () => {
    const p = createPending().payment;
    expect(() =>
      assertPaymentFinality({
        ...p,
        impliesFinancialSettlement: true as false,
      })
    ).toThrow(FinalityViolationError);
  });
});
