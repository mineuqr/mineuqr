/**
 * MULTI-CHECK-ALLOCATION-PERSISTENCE-1 — repository behavior with mocked DB client.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  set: vi.fn(),
  values: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getDb: vi.fn(async () => ({
    insert: mocks.insert,
    select: mocks.select,
    update: mocks.update,
  })),
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import {
  MultiCheckAllocationPersistenceError,
  existsMultiCheckAllocation,
  findMultiCheckAllocationByIdentity,
  insertMultiCheckAllocation,
  listAllocationHistory,
  updateMultiCheckAllocation,
} from "../multiCheckAllocationRepository";
import type { MultiCheckAllocation } from "@shared/operational-session";

const allocation: MultiCheckAllocation = {
  restaurantId: 1,
  allocationId: "alloc_1",
  allocationReference: "aref_1",
  financialReference: "fref_1",
  sourceCheckId: 10,
  sourcePaymentId: null,
  status: "pending",
  financialResponsibility: "50.00",
  allocatedAmount: "0.00",
  remainingAmount: "50.00",
  paymentValueCap: null,
  sources: [
    {
      sourceCheckId: 10,
      sourcePaymentId: null,
      financialReference: null,
      responsibilityAmount: "50.00",
    },
  ],
  portions: [
    {
      portionId: "por_1",
      allocationId: "alloc_1",
      sequence: 1,
      targetCheckId: 20,
      amount: "50.00",
      applied: false,
      createdAt: "2026-07-23 10:00:00",
    },
  ],
  adjustments: [],
  reversals: [],
  impliesCheckSettlement: false,
  impliesPaymentCompletion: false,
  createdAt: "2026-07-23 10:00:00",
  updatedAt: "2026-07-23 10:00:00",
};

describe("MULTI-CHECK-ALLOCATION-PERSISTENCE-1 repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts Allocation, children, and history; returns insertId", async () => {
    mocks.values.mockResolvedValue([{ insertId: 42 }]);
    mocks.insert.mockReturnValue({ values: mocks.values });

    const id = await insertMultiCheckAllocation(allocation, {
      mutationType: "create",
      allocationReason: "create",
    });
    expect(id).toBe(42);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        version: 1,
        status: "pending",
      })
    );
    // header + source + portion + history
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.values.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("maps duplicate Allocation key to DUPLICATE", async () => {
    mocks.values.mockRejectedValue({ code: "ER_DUP_ENTRY", errno: 1062 });
    mocks.insert.mockReturnValue({ values: mocks.values });

    await expect(insertMultiCheckAllocation(allocation)).rejects.toMatchObject({
      code: "DUPLICATE",
    });
  });

  it("loads Allocation by canonical identity with version", async () => {
    mocks.limit.mockResolvedValue([
      {
        id: 1,
        restaurantId: 1,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialReference: "fref_1",
        sourceCheckId: 10,
        sourcePaymentId: null,
        status: "pending",
        financialResponsibility: "50.00",
        allocatedAmount: "0.00",
        remainingAmount: "50.00",
        paymentValueCap: null,
        schemaVersion: 1,
        version: 2,
        allocationReason: null,
        createdAt: "2026-07-23 10:00:00",
        updatedAt: "2026-07-23 10:00:00",
      },
    ]);
    mocks.where
      .mockReturnValueOnce({ limit: mocks.limit })
      .mockResolvedValueOnce([
        {
          id: 1,
          restaurantId: 1,
          allocationId: "alloc_1",
          sourceCheckId: 10,
          sourcePaymentId: null,
          financialReference: null,
          responsibilityAmount: "50.00",
          createdAt: "2026-07-23 10:00:00",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          restaurantId: 1,
          allocationId: "alloc_1",
          portionId: "por_1",
          allocationSequence: 1,
          targetCheckId: 20,
          amount: "50.00",
          applied: false,
          createdAt: "2026-07-23 10:00:00",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    const found = await findMultiCheckAllocationByIdentity({
      restaurantId: 1,
      allocationId: "alloc_1",
    });
    expect(found?.version).toBe(2);
    expect(found?.allocation.allocationId).toBe("alloc_1");
    expect(found?.allocation.impliesCheckSettlement).toBe(false);
    expect(found?.allocation.portions[0]?.portionId).toBe("por_1");
  });

  it("existsMultiCheckAllocation is true when identity exists", async () => {
    mocks.limit.mockResolvedValue([
      {
        id: 1,
        restaurantId: 1,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialReference: null,
        sourceCheckId: 10,
        sourcePaymentId: null,
        status: "pending",
        financialResponsibility: "50.00",
        allocatedAmount: "0.00",
        remainingAmount: "50.00",
        paymentValueCap: null,
        schemaVersion: 1,
        version: 1,
        allocationReason: null,
        createdAt: "2026-07-23 10:00:00",
        updatedAt: "2026-07-23 10:00:00",
      },
    ]);
    mocks.where
      .mockReturnValueOnce({ limit: mocks.limit })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    expect(
      await existsMultiCheckAllocation({
        restaurantId: 1,
        allocationId: "alloc_1",
      })
    ).toBe(true);
  });

  it("update CAS succeeds when expectedVersion matches and appends history", async () => {
    mocks.set.mockReturnValue({
      where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
    });
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.values.mockResolvedValue([{ insertId: 1 }]);
    mocks.insert.mockReturnValue({ values: mocks.values });

    const next = await updateMultiCheckAllocation(
      { ...allocation, status: "reserved" },
      { expectedVersion: 1, mutationType: "reserve" }
    );
    expect(next).toBe(2);
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({ version: 2, status: "reserved" })
    );
  });

  it("update CAS maps version mismatch to CONFLICT", async () => {
    mocks.where
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockReturnValueOnce({
        limit: vi.fn().mockResolvedValue([
          {
            id: 1,
            restaurantId: 1,
            allocationId: "alloc_1",
            allocationReference: "aref_1",
            financialReference: null,
            sourceCheckId: 10,
            sourcePaymentId: null,
            status: "pending",
            financialResponsibility: "50.00",
            allocatedAmount: "0.00",
            remainingAmount: "50.00",
            paymentValueCap: null,
            schemaVersion: 1,
            version: 9,
            allocationReason: null,
            createdAt: "2026-07-23 10:00:00",
            updatedAt: "2026-07-23 10:00:00",
          },
        ]),
      })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    await expect(
      updateMultiCheckAllocation(allocation, { expectedVersion: 1 })
    ).rejects.toMatchObject({
      name: "MultiCheckAllocationPersistenceError",
      code: "CONFLICT",
    });
  });

  it("lists append-only history ordered by sequence", async () => {
    mocks.orderBy.mockResolvedValue([
      {
        id: 1,
        restaurantId: 1,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialReference: null,
        sourceCheckId: 10,
        targetCheckId: null,
        sourcePaymentId: null,
        previousRevision: 0,
        newRevision: 1,
        mutationType: "create",
        status: "pending",
        financialResponsibility: "50.00",
        allocatedAmount: "0.00",
        remainingAmount: "50.00",
        allocationReason: null,
        schemaVersion: 1,
        createdAt: "2026-07-23 10:00:00",
      },
      {
        id: 2,
        restaurantId: 1,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialReference: null,
        sourceCheckId: 10,
        targetCheckId: null,
        sourcePaymentId: null,
        previousRevision: 1,
        newRevision: 2,
        mutationType: "reserve",
        status: "reserved",
        financialResponsibility: "50.00",
        allocatedAmount: "0.00",
        remainingAmount: "50.00",
        allocationReason: null,
        schemaVersion: 1,
        createdAt: "2026-07-23 10:01:00",
      },
    ]);
    mocks.where.mockReturnValue({ orderBy: mocks.orderBy });
    mocks.from.mockReturnValue({ where: mocks.where });
    mocks.select.mockReturnValue({ from: mocks.from });

    const history = await listAllocationHistory({
      restaurantId: 1,
      allocationId: "alloc_1",
    });
    expect(history).toHaveLength(2);
    expect(history[0]?.mutationType).toBe("create");
    expect(history[0]?.previousRevision).toBe(0);
    expect(history[0]?.newRevision).toBe(1);
    expect(history[1]?.mutationType).toBe("reserve");
    expect(history[1]?.previousRevision).toBe(1);
    expect(history[1]?.newRevision).toBe(2);
  });
});
