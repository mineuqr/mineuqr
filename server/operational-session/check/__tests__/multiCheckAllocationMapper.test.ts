/**
 * MULTI-CHECK-ALLOCATION-PERSISTENCE-1 — mapper round-trip tests.
 */
import { describe, expect, it } from "vitest";
import type { MultiCheckAllocation } from "@shared/operational-session";
import {
  mapRowToAllocationHistory,
  mapRowsToMultiCheckAllocation,
  toAllocationAdjustmentInsertValues,
  toAllocationHistoryInsertValues,
  toAllocationPortionInsertValues,
  toAllocationReversalInsertValues,
  toAllocationSourceInsertValues,
  toMultiCheckAllocationInsertValues,
  toMultiCheckAllocationUpdateValues,
} from "../multiCheckAllocationMapper";

const allocation: MultiCheckAllocation = {
  restaurantId: 1,
  allocationId: "alloc_1",
  allocationReference: "aref_1",
  financialReference: "fref_1",
  sourceCheckId: 10,
  sourcePaymentId: "pay_1",
  status: "applied",
  financialResponsibility: "100.00",
  allocatedAmount: "100.00",
  remainingAmount: "0.00",
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
      portionId: "por_1",
      allocationId: "alloc_1",
      sequence: 1,
      targetCheckId: 20,
      amount: "40.00",
      applied: true,
      createdAt: "2026-07-23 10:00:00",
    },
    {
      portionId: "por_2",
      allocationId: "alloc_1",
      sequence: 2,
      targetCheckId: 30,
      amount: "60.00",
      applied: true,
      createdAt: "2026-07-23 10:00:00",
    },
  ],
  adjustments: [
    {
      adjustmentId: "adj_1",
      allocationId: "alloc_1",
      portionId: null,
      amount: "0.00",
      direction: "increase",
      createdAt: "2026-07-23 10:01:00",
    },
  ],
  reversals: [],
  impliesCheckSettlement: false,
  impliesPaymentCompletion: false,
  createdAt: "2026-07-23 10:00:00",
  updatedAt: "2026-07-23 10:05:00",
};

describe("MULTI-CHECK-ALLOCATION-PERSISTENCE-1 mapper", () => {
  it("round-trips Allocation header + children with identity preservation", () => {
    const insert = toMultiCheckAllocationInsertValues(allocation, {
      version: 1,
      allocationReason: "split_bill",
    });
    const header = {
      id: 1,
      ...insert,
    };
    const sourceRows = allocation.sources.map((s, i) => ({
      id: i + 1,
      ...toAllocationSourceInsertValues(allocation, s, allocation.createdAt),
    }));
    const portionRows = allocation.portions.map((p, i) => ({
      id: i + 1,
      ...toAllocationPortionInsertValues(allocation, p),
    }));
    const adjustmentRows = allocation.adjustments.map((a, i) => ({
      id: i + 1,
      ...toAllocationAdjustmentInsertValues(allocation, a),
    }));
    const reversalRows = allocation.reversals.map((r, i) => ({
      id: i + 1,
      ...toAllocationReversalInsertValues(allocation, r),
    }));

    const mapped = mapRowsToMultiCheckAllocation(
      header,
      sourceRows,
      portionRows,
      adjustmentRows,
      reversalRows
    );

    expect(mapped.allocationId).toBe("alloc_1");
    expect(mapped.allocationReference).toBe("aref_1");
    expect(mapped.financialReference).toBe("fref_1");
    expect(mapped.sourceCheckId).toBe(10);
    expect(mapped.sourcePaymentId).toBe("pay_1");
    expect(mapped.portions.map((p) => p.portionId)).toEqual(["por_1", "por_2"]);
    expect(mapped.portions.map((p) => p.sequence)).toEqual([1, 2]);
    expect(mapped.portions.map((p) => p.targetCheckId)).toEqual([20, 30]);
    expect(mapped.impliesCheckSettlement).toBe(false);
    expect(mapped.impliesPaymentCompletion).toBe(false);
    expect(mapped.allocatedAmount).toBe("100.00");
    expect(mapped.remainingAmount).toBe("0.00");
  });

  it("maps update values with next version", () => {
    const update = toMultiCheckAllocationUpdateValues(allocation, 3, "adjust");
    expect(update.version).toBe(3);
    expect(update.status).toBe("applied");
    expect(update.allocationReason).toBe("adjust");
  });

  it("maps history insert and row to audit record", () => {
    const historyInsert = toAllocationHistoryInsertValues({
      allocation,
      previousRevision: 1,
      newRevision: 2,
      mutationType: "apply",
      allocationReason: "apply_portions",
      targetCheckId: 20,
    });
    expect(historyInsert.previousRevision).toBe(1);
    expect(historyInsert.newRevision).toBe(2);
    expect(historyInsert.mutationType).toBe("apply");
    expect(historyInsert.allocationId).toBe("alloc_1");
    expect(historyInsert.sourceCheckId).toBe(10);
    expect(historyInsert.targetCheckId).toBe(20);

    const record = mapRowToAllocationHistory({
      id: 9,
      ...historyInsert,
    });
    expect(record.sequence).toBe(9);
    expect(record.previousRevision).toBe(1);
    expect(record.newRevision).toBe(2);
    expect(record.mutationType).toBe("apply");
  });

  it("does not persist Domain finality flags as columns", () => {
    const insert = toMultiCheckAllocationInsertValues(allocation);
    expect(insert).not.toHaveProperty("impliesCheckSettlement");
    expect(insert).not.toHaveProperty("impliesPaymentCompletion");
  });
});
