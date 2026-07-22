/**
 * SPLIT-PAYMENT-PROJECTION-1 — materializer idempotency / isolation.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type {
  CheckFinancialResponsibility,
  PaymentAttempt,
  SplitPayment,
  SplitPaymentDomainEvent,
} from "@shared/operational-session";
import {
  InMemorySplitPaymentProjectionStore,
  materializeSplitPaymentProjections,
  tryMaterializeSplitPaymentProjections,
} from "../index";

const AT = "2026-07-23T12:00:00.000Z";

function payment(): SplitPayment {
  return {
    restaurantId: 1,
    checkId: 10,
    paymentId: "pay_1",
    paymentReference: "pref_1",
    financialReference: null,
    status: "captured",
    amount: "50.00",
    allocatedAmount: "0.00",
    unallocatedAmount: "50.00",
    tenders: [
      {
        tenderId: "t1",
        restaurantId: 1,
        checkId: 10,
        paymentId: "pay_1",
        method: "cash",
        amount: "50.00",
        createdAt: AT,
      },
    ],
    tenderAllocations: [],
    allocations: [],
    impliesFinancialSettlement: false,
    createdAt: AT,
    updatedAt: AT,
  };
}

describe("SPLIT-PAYMENT-PROJECTION-1 materializer", () => {
  let store: InMemorySplitPaymentProjectionStore;

  beforeEach(() => {
    store = new InMemorySplitPaymentProjectionStore();
  });

  it("materializes payments, attempts, and outstanding from committed state", async () => {
    const attempt: PaymentAttempt = {
      restaurantId: 1,
      checkId: 10,
      attemptId: "att_1",
      paymentId: "pay_1",
      status: "succeeded",
      amount: "50.00",
      method: "cash",
      createdAt: AT,
      updatedAt: AT,
    };
    const outstanding: CheckFinancialResponsibility = {
      restaurantId: 1,
      checkId: 10,
      financialResponsibility: "100.00",
      appliedPaymentValue: "50.00",
      outstandingBalance: "50.00",
    };
    const events: SplitPaymentDomainEvent[] = [
      {
        eventType: "PaymentCaptured",
        restaurantId: 1,
        checkId: 10,
        paymentId: "pay_1",
        paymentReference: "pref_1",
        financialReference: null,
        occurredAt: AT,
        status: "captured",
        amount: "50.00",
      },
    ];

    const result = await materializeSplitPaymentProjections(store, {
      committedPayments: [payment()],
      committedAttempts: [attempt],
      committedOutstanding: outstanding,
      events,
      projectionTimestamp: AT,
    });

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0]?.paymentId).toBe("pay_1");
    expect(result.attempts[0]?.attemptId).toBe("att_1");
    expect(result.outstanding?.outstandingBalance).toBe("50.00");
    expect(result.appliedEventClaims).toBe(1);

    const loaded = await store.findPaymentByIdentity({
      restaurantId: 1,
      checkId: 10,
      paymentId: "pay_1",
    });
    expect(loaded?.projectionRevision).toBe(
      result.payments[0]?.projectionRevision
    );
  });

  it("idempotent replay skips duplicate event claims and keeps same revision", async () => {
    const events: SplitPaymentDomainEvent[] = [
      {
        eventType: "PaymentCreated",
        restaurantId: 1,
        checkId: 10,
        paymentId: "pay_1",
        paymentReference: "pref_1",
        financialReference: null,
        occurredAt: AT,
        status: "pending",
        amount: "50.00",
      },
    ];
    const first = await materializeSplitPaymentProjections(store, {
      committedPayments: [payment()],
      events,
    });
    const second = await materializeSplitPaymentProjections(store, {
      committedPayments: [payment()],
      events,
    });
    expect(second.skippedDuplicateEventClaims).toBe(1);
    expect(second.appliedEventClaims).toBe(0);
    expect(second.payments[0]?.projectionRevision).toBe(
      first.payments[0]?.projectionRevision
    );
  });

  it("tryMaterialize isolates store failures from Write Model", async () => {
    const failingStore = {
      upsertPayment: async () => {
        throw new Error("store down");
      },
      findPaymentByIdentity: async () => null,
      listPaymentsByCheck: async () => [],
      listPaymentsByRestaurant: async () => [],
      upsertAttempt: async () => undefined,
      findAttemptByIdentity: async () => null,
      listAttemptsByCheck: async () => [],
      listAttemptsByPayment: async () => [],
      upsertOutstanding: async () => undefined,
      findOutstandingByIdentity: async () => null,
      hasEventClaim: async () => false,
      recordEventClaim: async () => undefined,
    };

    const result = await tryMaterializeSplitPaymentProjections(failingStore, {
      committedPayments: [payment()],
    });
    expect(result).toBeNull();
  });
});
