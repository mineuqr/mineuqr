import { describe, expect, it } from "vitest";
import {
  adjustAllocation,
  applyAllocation,
  assertMultiCheckAllocationSetValid,
  cancelAllocation,
  completeAllocation,
  createMultiCheckAllocation,
  reserveAllocation,
  reverseAllocation,
  sumAllocatedToTarget,
} from "../multiCheckAllocationCommands";
import { classifyAllocationCardinality } from "../multiCheckAllocationContract";
import {
  AllocationAlreadyCompletedError,
  AllocationExceededError,
  IllegalTerminalTransitionError,
  InvalidAllocationStateError,
  InvalidAllocationTransitionError,
  PaymentValueExceededError,
} from "../multiCheckAllocationErrors";
import { assertIdentityUnchanged } from "../multiCheckAllocationIdentity";
import { assertAllocationFinality } from "../multiCheckAllocationInvariants";
import { assertTransitionAllowed } from "../multiCheckAllocationLifecycle";
import { assertAllocationConservation } from "../multiCheckAllocationMoney";

const AT = "2026-07-23T00:00:00.000Z";

function createBase(
  overrides: Partial<Parameters<typeof createMultiCheckAllocation>[0]> = {}
) {
  return createMultiCheckAllocation({
    restaurantId: 1,
    checkRestaurantId: 1,
    allocationId: "alloc_1",
    allocationReference: "aref_1",
    financialReference: "fref_1",
    sourceCheckId: 10,
    financialResponsibility: "100.00",
    portions: [
      {
        portionId: "por_1",
        sequence: 1,
        targetCheckId: 20,
        amount: "100.00",
      },
    ],
    at: AT,
    ...overrides,
  });
}

function reserveApply(allocationId = "alloc_1") {
  let a = createBase({ allocationId }).allocation;
  a = reserveAllocation({ allocation: a, at: AT }).allocation;
  a = applyAllocation({ allocation: a, at: AT }).allocation;
  return a;
}

describe("multiCheckAllocationCommands lifecycle", () => {
  it("creates pending Allocation with stable identities", () => {
    const r = createBase();
    expect(r.outcome).toBe("applied");
    expect(r.allocation.status).toBe("pending");
    expect(r.allocation.impliesCheckSettlement).toBe(false);
    expect(r.allocation.impliesPaymentCompletion).toBe(false);
    expect(r.events.map((e) => e.eventType)).toContain("AllocationCreated");
    assertAllocationConservation(r.allocation);
  });

  it("reserves then applies then completes (one-to-one)", () => {
    let a = createBase().allocation;
    expect(classifyAllocationCardinality(a)).toBe("one_to_one");

    const reserved = reserveAllocation({ allocation: a, at: AT });
    expect(reserved.outcome).toBe("applied");
    expect(reserved.allocation.status).toBe("reserved");
    a = reserved.allocation;

    const applied = applyAllocation({ allocation: a, at: AT });
    expect(applied.allocation.status).toBe("applied");
    expect(applied.allocation.allocatedAmount).toBe("100.00");
    expect(applied.allocation.remainingAmount).toBe("0.00");
    expect(applied.events.map((e) => e.eventType)).toEqual(
      expect.arrayContaining([
        "AllocationApplied",
        "AllocationResponsibilityTransferred",
        "AllocationOutstandingChanged",
      ])
    );
    a = applied.allocation;
    assertIdentityUnchanged(reserved.allocation, a);

    const completed = completeAllocation({ allocation: a, at: AT });
    expect(completed.allocation.status).toBe("completed");
    expect(completed.events[0]).toMatchObject({
      eventType: "AllocationCompleted",
      impliesCheckSettlement: false,
      impliesPaymentCompletion: false,
    });
    assertAllocationFinality(completed.allocation);
  });

  it("idempotent reserve / apply / complete / cancel", () => {
    let a = createBase().allocation;
    a = reserveAllocation({ allocation: a, at: AT }).allocation;
    expect(reserveAllocation({ allocation: a, at: AT }).outcome).toBe(
      "already_applied"
    );

    a = applyAllocation({ allocation: a, at: AT }).allocation;
    expect(applyAllocation({ allocation: a, at: AT }).outcome).toBe(
      "already_applied"
    );

    a = completeAllocation({ allocation: a, at: AT }).allocation;
    expect(completeAllocation({ allocation: a, at: AT }).outcome).toBe(
      "already_applied"
    );

    const cancelled = cancelAllocation({
      allocation: createBase({ allocationId: "alloc_cancel" }).allocation,
      at: AT,
    }).allocation;
    expect(cancelAllocation({ allocation: cancelled, at: AT }).outcome).toBe(
      "already_applied"
    );
  });

  it("protects terminal states from reopen", () => {
    const completed = completeAllocation({
      allocation: reserveApply("alloc_term"),
      at: AT,
    }).allocation;
    expect(() => assertTransitionAllowed("completed", "pending")).toThrow(
      IllegalTerminalTransitionError
    );
    expect(() =>
      reserveAllocation({ allocation: completed, at: AT })
    ).toThrow(AllocationAlreadyCompletedError);
  });

  it("rejects illegal transitions", () => {
    const pending = createBase({ allocationId: "alloc_bad" }).allocation;
    expect(() => applyAllocation({ allocation: pending, at: AT })).toThrow(
      InvalidAllocationStateError
    );
    expect(() => assertTransitionAllowed("pending", "completed")).toThrow(
      InvalidAllocationTransitionError
    );
  });
});

describe("multiCheckAllocationCommands cardinalities", () => {
  it("one-to-many: one source payment funds multiple target Checks", () => {
    const created = createBase({
      allocationId: "alloc_1n",
      sourcePaymentId: "pay_1",
      paymentValueCap: "100.00",
      financialResponsibility: "100.00",
      portions: [
        {
          portionId: "por_a",
          sequence: 1,
          targetCheckId: 20,
          amount: "40.00",
        },
        {
          portionId: "por_b",
          sequence: 2,
          targetCheckId: 30,
          amount: "60.00",
        },
      ],
    });
    expect(classifyAllocationCardinality(created.allocation)).toBe(
      "one_to_many"
    );

    let a = reserveAllocation({
      allocation: created.allocation,
      at: AT,
    }).allocation;
    a = applyAllocation({ allocation: a, at: AT }).allocation;
    expect(a.allocatedAmount).toBe("100.00");
    expect(a.remainingAmount).toBe("0.00");
    expect(
      a.portions.filter((p) => p.applied).map((p) => p.targetCheckId).sort()
    ).toEqual([20, 30]);
    a = completeAllocation({ allocation: a, at: AT }).allocation;
    expect(a.status).toBe("completed");
  });

  it("many-to-one: multiple Allocations fund one target Check", () => {
    const a1 = applyAllocation({
      allocation: reserveAllocation({
        allocation: createBase({
          allocationId: "alloc_m1_a",
          financialResponsibility: "40.00",
          portions: [
            {
              portionId: "por_m1_a",
              sequence: 1,
              targetCheckId: 99,
              amount: "40.00",
            },
          ],
        }).allocation,
        at: AT,
      }).allocation,
      at: AT,
    }).allocation;

    const a2 = applyAllocation({
      allocation: reserveAllocation({
        allocation: createBase({
          allocationId: "alloc_m1_b",
          sourceCheckId: 11,
          financialResponsibility: "60.00",
          portions: [
            {
              portionId: "por_m1_b",
              sequence: 1,
              targetCheckId: 99,
              amount: "60.00",
            },
          ],
        }).allocation,
        at: AT,
      }).allocation,
      at: AT,
    }).allocation;

    assertMultiCheckAllocationSetValid([a1, a2]);
    expect(sumAllocatedToTarget([a1, a2], 99)).toBe("100.00");
    expect(classifyAllocationCardinality(a1)).toBe("one_to_one");
  });

  it("many-to-many: multi-source Allocation with multi-target Portions", () => {
    const created = createBase({
      allocationId: "alloc_nn",
      financialResponsibility: "90.00",
      sources: [
        {
          sourceCheckId: 10,
          responsibilityAmount: "50.00",
        },
        {
          sourceCheckId: 11,
          responsibilityAmount: "40.00",
        },
      ],
      portions: [
        {
          portionId: "por_nn_1",
          sequence: 1,
          targetCheckId: 20,
          amount: "50.00",
        },
        {
          portionId: "por_nn_2",
          sequence: 2,
          targetCheckId: 30,
          amount: "40.00",
        },
      ],
    });
    expect(classifyAllocationCardinality(created.allocation)).toBe(
      "many_to_many"
    );
    let a = reserveAllocation({
      allocation: created.allocation,
      at: AT,
    }).allocation;
    a = applyAllocation({ allocation: a, at: AT }).allocation;
    expect(a.allocatedAmount).toBe("90.00");
    assertAllocationConservation(a);
  });
});

describe("multiCheckAllocationCommands adjustments and reversals", () => {
  it("adjusts then completes", () => {
    let a = createBase({
      allocationId: "alloc_adj",
      financialResponsibility: "100.00",
      portions: [
        {
          portionId: "por_adj",
          sequence: 1,
          targetCheckId: 20,
          amount: "80.00",
        },
      ],
    }).allocation;
    a = reserveAllocation({ allocation: a, at: AT }).allocation;
    a = applyAllocation({ allocation: a, at: AT }).allocation;
    expect(a.remainingAmount).toBe("20.00");

    const adjusted = adjustAllocation({
      allocation: a,
      adjustmentId: "adj_1",
      amount: "20.00",
      direction: "increase",
      at: AT,
    });
    expect(adjusted.outcome).toBe("applied");
    expect(adjusted.allocation.status).toBe("adjusted");
    expect(adjusted.allocation.allocatedAmount).toBe("100.00");
    expect(adjusted.allocation.remainingAmount).toBe("0.00");
    expect(
      adjustAllocation({
        allocation: adjusted.allocation,
        adjustmentId: "adj_1",
        amount: "20.00",
        direction: "increase",
        at: AT,
      }).outcome
    ).toBe("already_applied");

    const completed = completeAllocation({
      allocation: adjusted.allocation,
      at: AT,
    });
    expect(completed.allocation.status).toBe("completed");
  });

  it("reverses applied Allocation and restores remaining", () => {
    let a = reserveApply("alloc_rev");
    const reversed = reverseAllocation({
      allocation: a,
      reversalId: "rev_1",
      at: AT,
    });
    expect(reversed.allocation.status).toBe("reversed");
    expect(reversed.allocation.allocatedAmount).toBe("0.00");
    expect(reversed.allocation.remainingAmount).toBe("100.00");
    expect(reversed.events.map((e) => e.eventType)).toEqual(
      expect.arrayContaining([
        "AllocationReversed",
        "AllocationOutstandingChanged",
      ])
    );
    assertAllocationConservation(reversed.allocation);
    expect(
      reverseAllocation({
        allocation: reversed.allocation,
        reversalId: "rev_1",
        at: AT,
      }).outcome
    ).toBe("already_applied");
  });
});

describe("multiCheckAllocationCommands conservation and identity", () => {
  it("never exceeds responsibility or payment value", () => {
    expect(() =>
      createBase({
        allocationId: "alloc_over",
        financialResponsibility: "50.00",
        portions: [
          {
            portionId: "por_over",
            sequence: 1,
            targetCheckId: 20,
            amount: "60.00",
          },
        ],
      })
    ).toThrow(AllocationExceededError);

    expect(() =>
      createBase({
        allocationId: "alloc_pay",
        sourcePaymentId: "pay_x",
        paymentValueCap: "30.00",
        financialResponsibility: "50.00",
        portions: [
          {
            portionId: "por_pay",
            sequence: 1,
            targetCheckId: 20,
            amount: "40.00",
          },
        ],
      })
    ).toThrow(PaymentValueExceededError);
  });

  it("preserves identities across lifecycle", () => {
    const created = createBase({ allocationId: "alloc_id" }).allocation;
    const reserved = reserveAllocation({
      allocation: created,
      at: AT,
    }).allocation;
    const applied = applyAllocation({
      allocation: reserved,
      at: AT,
    }).allocation;
    const completed = completeAllocation({
      allocation: applied,
      at: AT,
    }).allocation;
    assertIdentityUnchanged(created, completed);
    expect(completed.allocationId).toBe("alloc_id");
    expect(completed.allocationReference).toBe("aref_1");
    expect(completed.sourceCheckId).toBe(10);
  });

  it("completion does not imply Check settlement or Payment completion", () => {
    const completed = completeAllocation({
      allocation: reserveApply("alloc_fin"),
      at: AT,
    }).allocation;
    expect(completed.impliesCheckSettlement).toBe(false);
    expect(completed.impliesPaymentCompletion).toBe(false);
  });

  it("cannot complete while remaining > 0", () => {
    let a = createBase({
      allocationId: "alloc_rem",
      financialResponsibility: "100.00",
      portions: [
        {
          portionId: "por_rem",
          sequence: 1,
          targetCheckId: 20,
          amount: "40.00",
        },
      ],
    }).allocation;
    a = reserveAllocation({ allocation: a, at: AT }).allocation;
    a = applyAllocation({ allocation: a, at: AT }).allocation;
    expect(() => completeAllocation({ allocation: a, at: AT })).toThrow(
      InvalidAllocationStateError
    );
  });
});
