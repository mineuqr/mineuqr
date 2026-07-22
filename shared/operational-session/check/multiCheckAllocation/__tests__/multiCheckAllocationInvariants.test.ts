import { describe, expect, it } from "vitest";
import { createMultiCheckAllocation } from "../multiCheckAllocationCommands";
import { FinalityViolationError } from "../multiCheckAllocationErrors";
import {
  assertAllocationFinality,
  assertMultiCheckAllocationValid,
} from "../multiCheckAllocationInvariants";
import { classifyAllocationCardinality } from "../multiCheckAllocationContract";

const AT = "2026-07-23T00:00:00.000Z";

function createOneToOne() {
  return createMultiCheckAllocation({
    restaurantId: 1,
    checkRestaurantId: 1,
    allocationId: "alloc_1",
    allocationReference: "aref_1",
    financialReference: "fref_1",
    sourceCheckId: 10,
    financialResponsibility: "50.00",
    portions: [
      {
        portionId: "por_1",
        sequence: 1,
        targetCheckId: 20,
        amount: "50.00",
      },
    ],
    at: AT,
  }).allocation;
}

describe("multiCheckAllocationInvariants", () => {
  it("validates created Allocation and finality flags", () => {
    const a = createOneToOne();
    assertMultiCheckAllocationValid(a);
    assertAllocationFinality(a);
    expect(a.impliesCheckSettlement).toBe(false);
    expect(a.impliesPaymentCompletion).toBe(false);
  });

  it("rejects finality violations", () => {
    const a = createOneToOne();
    expect(() =>
      assertAllocationFinality({
        ...a,
        impliesCheckSettlement: true as unknown as false,
      })
    ).toThrow(FinalityViolationError);
  });

  it("classifies cardinality", () => {
    expect(
      classifyAllocationCardinality({
        sources: [
          {
            sourceCheckId: 1,
            sourcePaymentId: null,
            financialReference: null,
            responsibilityAmount: "10.00",
          },
        ],
        portions: [
          {
            portionId: "p1",
            allocationId: "a",
            sequence: 1,
            targetCheckId: 2,
            amount: "10.00",
            applied: false,
            createdAt: AT,
          },
        ],
      })
    ).toBe("one_to_one");

    expect(
      classifyAllocationCardinality({
        sources: [
          {
            sourceCheckId: 1,
            sourcePaymentId: null,
            financialReference: null,
            responsibilityAmount: "30.00",
          },
        ],
        portions: [
          {
            portionId: "p1",
            allocationId: "a",
            sequence: 1,
            targetCheckId: 2,
            amount: "10.00",
            applied: false,
            createdAt: AT,
          },
          {
            portionId: "p2",
            allocationId: "a",
            sequence: 2,
            targetCheckId: 3,
            amount: "20.00",
            applied: false,
            createdAt: AT,
          },
        ],
      })
    ).toBe("one_to_many");
  });
});
