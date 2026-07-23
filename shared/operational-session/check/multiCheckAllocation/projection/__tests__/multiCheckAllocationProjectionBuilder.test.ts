/**
 * MULTI-CHECK-ALLOCATION-PROJECTION-1 — builder determinism / snapshot governance.
 */
import { describe, expect, it } from "vitest";
import type { MultiCheckAllocation } from "../../multiCheckAllocationContract";
import type { MultiCheckAllocationCommittedSnapshot } from "../multiCheckAllocationProjectionContract";
import {
  assertMultiCheckAllocationProjectionSnapshotCoherent,
  buildMultiCheckAllocationProjection,
  buildMultiCheckAllocationProjectionEventClaimKey,
  buildMultiCheckAllocationProjectionRevision,
  buildMultiCheckAllocationResponsibilityProjection,
  buildMultiCheckAllocationSummaryProjection,
  isMultiCheckAllocationProjectionSnapshotCoherent,
} from "../multiCheckAllocationProjectionBuilder";

const AT = "2026-07-23T12:00:00.000Z";

function allocation(
  overrides: Partial<MultiCheckAllocation> = {}
): MultiCheckAllocation {
  return {
    restaurantId: 1,
    allocationId: "alloc_1",
    allocationReference: "aref_1",
    financialReference: "fref_1",
    sourceCheckId: 10,
    sourcePaymentId: "pay_1",
    status: "applied",
    financialResponsibility: "100.00",
    allocatedAmount: "60.00",
    remainingAmount: "40.00",
    paymentValueCap: "100.00",
    sources: [
      {
        sourceCheckId: 10,
        sourcePaymentId: "pay_1",
        financialReference: "fref_1",
        responsibilityAmount: "100.00",
      },
    ],
    portions: [
      {
        portionId: "p2",
        allocationId: "alloc_1",
        sequence: 2,
        targetCheckId: 30,
        amount: "20.00",
        applied: true,
        createdAt: "2026-07-23T12:00:02.000Z",
      },
      {
        portionId: "p1",
        allocationId: "alloc_1",
        sequence: 1,
        targetCheckId: 20,
        amount: "40.00",
        applied: true,
        createdAt: "2026-07-23T12:00:01.000Z",
      },
    ],
    adjustments: [
      {
        adjustmentId: "adj_1",
        allocationId: "alloc_1",
        portionId: "p1",
        amount: "5.00",
        direction: "decrease",
        createdAt: "2026-07-23T12:00:03.000Z",
      },
    ],
    reversals: [],
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    createdAt: AT,
    updatedAt: "2026-07-23T12:05:00.000Z",
    ...overrides,
  };
}

function snapshot(
  overrides: Partial<MultiCheckAllocation> = {},
  allocationRevision = 2
): MultiCheckAllocationCommittedSnapshot {
  return { allocation: allocation(overrides), allocationRevision };
}

describe("MULTI-CHECK-ALLOCATION-PROJECTION-1 builder", () => {
  it("maps Write Model fields and preserves canonical identities", () => {
    const p = buildMultiCheckAllocationProjection(snapshot());
    expect(p.allocationId).toBe("alloc_1");
    expect(p.allocationReference).toBe("aref_1");
    expect(p.financialReference).toBe("fref_1");
    expect(p.sourceCheckId).toBe(10);
    expect(p.sourcePaymentId).toBe("pay_1");
    expect(p.allocationRevision).toBe(2);
    expect(p.financialResponsibility).toBe("100.00");
    expect(p.allocatedAmount).toBe("60.00");
    expect(p.remainingAmount).toBe("40.00");
    expect(p.isApplied).toBe(true);
    expect(p.impliesCheckSettlement).toBe(false);
    expect(p.impliesPaymentCompletion).toBe(false);
    expect(p.portionCount).toBe(2);
    expect(p.targetCheckIds).toEqual([20, 30]);
    expect(p.portions.map((x) => x.portionId)).toEqual(["p1", "p2"]);
    expect(p.projectionSchemaVersion).toBe(2);
    expect(p.metadata.projectionId).toBe("MCA-P-01-multi-check-allocation");
    expect(p.metadata.projectionRevision).toBe(p.projectionRevision);
    expect(p.metadata.allocationRevision).toBe(2);
    expect(p.metadata.financialReference).toBe("fref_1");
  });

  it("duplicate projection execution is identical", () => {
    const src = snapshot();
    const a = buildMultiCheckAllocationProjection(src);
    const b = buildMultiCheckAllocationProjection(src);
    expect(a).toEqual(b);
    expect(a.projectionRevision).toBe(
      buildMultiCheckAllocationProjectionRevision(src)
    );
  });

  it("orders historical timeline deterministically", () => {
    const p = buildMultiCheckAllocationProjection(snapshot());
    expect(p.timeline.map((e) => e.kind)).toEqual([
      "source",
      "portion",
      "portion",
      "adjustment",
    ]);
    expect(
      p.timeline.every((e, i, arr) => i === 0 || arr[i - 1]!.at <= e.at)
    ).toBe(true);
  });

  it("preserves financial values without inventing money", () => {
    const src = snapshot({
      financialResponsibility: "88.50",
      allocatedAmount: "33.25",
      remainingAmount: "55.25",
    });
    const p = buildMultiCheckAllocationProjection(src);
    expect(p.financialResponsibility).toBe("88.50");
    expect(p.allocatedAmount).toBe("33.25");
    expect(p.remainingAmount).toBe("55.25");
    expect(p.responsibility.remainingAmount).toBe("55.25");
    expect(p.sources[0]?.responsibilityAmount).toBe("100.00");
  });

  it("builds summary and responsibility projections", () => {
    const src = snapshot();
    const summary = buildMultiCheckAllocationSummaryProjection(src, {
      projectionTimestamp: AT,
    });
    expect(summary.allocationId).toBe("alloc_1");
    expect(summary.allocationRevision).toBe(2);
    expect(summary.portionCount).toBe(2);
    expect(summary.cardinality).toBe("one_to_many");
    expect(summary.impliesCheckSettlement).toBe(false);

    const responsibility = buildMultiCheckAllocationResponsibilityProjection(
      src,
      { projectionTimestamp: AT }
    );
    expect(responsibility.allocatedAmount).toBe("60.00");
    expect(responsibility.allocationRevision).toBe(2);
    expect(responsibility.projectionRevision).toContain("60.00");
  });

  it("revision updates when Allocation Revision or Write Model fields change", () => {
    const before = buildMultiCheckAllocationProjectionRevision(snapshot());
    const afterFields = buildMultiCheckAllocationProjectionRevision(
      snapshot({
        status: "adjusted",
        allocatedAmount: "55.00",
        remainingAmount: "45.00",
        updatedAt: "2026-07-23T13:00:00.000Z",
      })
    );
    const afterRevision = buildMultiCheckAllocationProjectionRevision(
      snapshot({}, 3)
    );
    expect(afterFields).not.toBe(before);
    expect(afterRevision).not.toBe(before);
  });

  it("emits one coherent immutable snapshot stamp across nested read models", () => {
    const p = buildMultiCheckAllocationProjection(snapshot(), {
      projectionTimestamp: AT,
    });
    expect(isMultiCheckAllocationProjectionSnapshotCoherent(p)).toBe(true);
    assertMultiCheckAllocationProjectionSnapshotCoherent(p);

    expect(p.projectionTimestamp).toBe(AT);
    expect(p.allocationRevision).toBe(2);
    expect(p.financialReference).toBe("fref_1");
    for (const child of [...p.portions, ...p.adjustments, p.responsibility]) {
      expect(child.allocationRevision).toBe(2);
      expect(child.projectionTimestamp).toBe(AT);
      expect(child.financialReference).toBe("fref_1");
      expect(child.projectionRevision.startsWith(p.projectionRevision)).toBe(
        true
      );
    }
  });

  it("rejects incoherent snapshots that mix Allocation revisions", () => {
    const p = buildMultiCheckAllocationProjection(snapshot());
    const mixed = {
      ...p,
      portions: p.portions.map((portion, i) =>
        i === 0 ? { ...portion, allocationRevision: 999 } : portion
      ),
    };
    expect(isMultiCheckAllocationProjectionSnapshotCoherent(mixed)).toBe(false);
    expect(() =>
      assertMultiCheckAllocationProjectionSnapshotCoherent(mixed)
    ).toThrow(/not coherent/);
  });

  it("builds deterministic event claim keys", () => {
    const key = buildMultiCheckAllocationProjectionEventClaimKey({
      eventType: "AllocationApplied",
      restaurantId: 1,
      allocationId: "alloc_1",
      allocationReference: "aref_1",
      financialReference: "fref_1",
      sourceCheckId: 10,
      sourcePaymentId: "pay_1",
      occurredAt: AT,
      status: "applied",
      allocatedAmount: "60.00",
      remainingAmount: "40.00",
    });
    expect(key).toContain("AllocationApplied");
    expect(key).toContain("alloc_1");
    expect(
      buildMultiCheckAllocationProjectionEventClaimKey({
        eventType: "AllocationApplied",
        restaurantId: 1,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialReference: "fref_1",
        sourceCheckId: 10,
        sourcePaymentId: "pay_1",
        occurredAt: AT,
        status: "applied",
        allocatedAmount: "60.00",
        remainingAmount: "40.00",
      })
    ).toBe(key);
  });
});
