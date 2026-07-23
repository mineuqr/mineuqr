/**
 * MULTI-CHECK-ALLOCATION-INTEGRATION-1 — Aggregate orchestration + Domain + Repository.
 * Domain is real; Check / repository deps are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MultiCheckAllocation } from "@shared/operational-session";

const mocks = vi.hoisted(() => ({
  findCheckById: vi.fn(),
  findMultiCheckAllocationByIdentity: vi.fn(),
  listMultiCheckAllocationsForSourceCheck: vi.fn(),
  insertMultiCheckAllocation: vi.fn(),
  updateMultiCheckAllocation: vi.fn(),
}));

vi.mock("../checkRepository", () => ({
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
}));

vi.mock("../checkMapper", () => ({
  mapRowToOperationalCheck: (row: Record<string, unknown>) => ({
    id: row.id,
    restaurantId: row.restaurantId,
    sessionId: null,
    outcome: row.outcome ?? "open",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      mode: "exclusive",
      components: [],
    },
    serviceChargeSnapshot: null,
    billDiscountAmount: "0.00",
    subtotal: "100.00",
    taxAmount: "0.00",
    taxBreakdown: { lines: [], totalTax: "0.00" },
    grandTotal: row.grandTotal ?? "100.00",
    snapshotsFrozenAt: "t",
    totalsFrozenAt: null,
    settledAt: null,
    voidedAt: null,
    createdAt: "t",
    updatedAt: "t",
  }),
}));

vi.mock("../multiCheckAllocationRepository", () => {
  class MultiCheckAllocationPersistenceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "MultiCheckAllocationPersistenceError";
      this.code = code;
    }
  }
  return {
    MultiCheckAllocationPersistenceError,
    findMultiCheckAllocationByIdentity: (...a: unknown[]) =>
      mocks.findMultiCheckAllocationByIdentity(...a),
    listMultiCheckAllocationsForSourceCheck: (...a: unknown[]) =>
      mocks.listMultiCheckAllocationsForSourceCheck(...a),
    insertMultiCheckAllocation: (...a: unknown[]) =>
      mocks.insertMultiCheckAllocation(...a),
    updateMultiCheckAllocation: (...a: unknown[]) =>
      mocks.updateMultiCheckAllocation(...a),
  };
});

import {
  adjustAllocationOnCheck,
  applyAllocationOnCheck,
  cancelAllocationOnCheck,
  completeAllocationOnCheck,
  createAllocationOnCheck,
  reserveAllocationOnCheck,
  reverseAllocationOnCheck,
} from "../checkMultiCheckAllocationIntegration";
import { MultiCheckAllocationPersistenceError } from "../multiCheckAllocationRepository";

const AT = "2026-07-23 12:00:00";
const TX = { tag: "tx" } as never;

function openCheckRow() {
  return {
    id: 10,
    restaurantId: 1,
    outcome: "open",
    grandTotal: "100.00",
  };
}

function allocation(
  overrides: Partial<MultiCheckAllocation> = {}
): MultiCheckAllocation {
  return {
    restaurantId: 1,
    allocationId: "alloc_1",
    allocationReference: "aref_1",
    financialReference: "fref_1",
    sourceCheckId: 10,
    sourcePaymentId: null,
    status: "pending",
    financialResponsibility: "100.00",
    allocatedAmount: "0.00",
    remainingAmount: "100.00",
    paymentValueCap: null,
    sources: [
      {
        sourceCheckId: 10,
        sourcePaymentId: null,
        financialReference: null,
        responsibilityAmount: "100.00",
      },
    ],
    portions: [
      {
        portionId: "por_1",
        allocationId: "alloc_1",
        sequence: 1,
        targetCheckId: 20,
        amount: "100.00",
        applied: false,
        createdAt: AT,
      },
    ],
    adjustments: [],
    reversals: [],
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

describe("MULTI-CHECK-ALLOCATION-INTEGRATION-1 orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findCheckById.mockResolvedValue(openCheckRow());
    mocks.listMultiCheckAllocationsForSourceCheck.mockResolvedValue([]);
    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue(null);
    mocks.insertMultiCheckAllocation.mockResolvedValue(1);
    mocks.updateMultiCheckAllocation.mockResolvedValue(2);
  });

  it("creates Allocation via Domain and persists with SessionDbClient", async () => {
    const result = await createAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialResponsibility: "100.00",
        portions: [
          {
            portionId: "por_1",
            sequence: 1,
            targetCheckId: 20,
            amount: "100.00",
          },
        ],
      },
      TX
    );
    expect(result.outcome).toBe("applied");
    expect(result.allocation?.allocationId).toBe("alloc_1");
    expect(result.allocation?.sourceCheckId).toBe(10);
    expect(result.version).toBe(1);
    expect(result.events.map((e) => e.eventType)).toContain("AllocationCreated");
    expect(mocks.insertMultiCheckAllocation).toHaveBeenCalledWith(
      expect.objectContaining({ allocationId: "alloc_1" }),
      expect.objectContaining({ mutationType: "create" }),
      TX
    );
  });

  it("ATOMICITY: rejects mutation without Check-owned SessionDbClient", async () => {
    await expect(
      createAllocationOnCheck({
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialResponsibility: "100.00",
        portions: [
          {
            portionId: "por_1",
            sequence: 1,
            targetCheckId: 20,
            amount: "100.00",
          },
        ],
      })
    ).rejects.toThrow(/ATOMICITY.*SessionDbClient/);
    expect(mocks.insertMultiCheckAllocation).not.toHaveBeenCalled();
  });

  it("ATOMICITY: does not return events when persistence fails", async () => {
    mocks.insertMultiCheckAllocation.mockRejectedValue(new Error("write failed"));
    await expect(
      createAllocationOnCheck(
        {
          restaurantId: 1,
          checkId: 10,
          allocationId: "alloc_1",
          allocationReference: "aref_1",
          financialResponsibility: "100.00",
          portions: [
            {
              portionId: "por_1",
              sequence: 1,
              targetCheckId: 20,
              amount: "100.00",
            },
          ],
        },
        TX
      )
    ).rejects.toThrow("write failed");
  });

  it("create is idempotent when identity already exists", async () => {
    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: allocation(),
      version: 3,
      schemaVersion: 1,
      allocationReason: null,
    });
    const result = await createAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialResponsibility: "100.00",
        portions: [
          {
            portionId: "por_1",
            sequence: 1,
            targetCheckId: 20,
            amount: "100.00",
          },
        ],
      },
      TX
    );
    expect(result.outcome).toBe("already_applied");
    expect(result.version).toBe(3);
    expect(result.events).toEqual([]);
    expect(mocks.insertMultiCheckAllocation).not.toHaveBeenCalled();
  });

  it("maps insert DUPLICATE race to already_applied", async () => {
    mocks.insertMultiCheckAllocation.mockRejectedValue(
      new MultiCheckAllocationPersistenceError("DUPLICATE", "dup")
    );
    mocks.findMultiCheckAllocationByIdentity
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        allocation: allocation(),
        version: 1,
        schemaVersion: 1,
        allocationReason: null,
      });
    const result = await createAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialResponsibility: "100.00",
        portions: [
          {
            portionId: "por_1",
            sequence: 1,
            targetCheckId: 20,
            amount: "100.00",
          },
        ],
      },
      TX
    );
    expect(result.outcome).toBe("already_applied");
    expect(result.version).toBe(1);
  });

  it("reserves / applies / completes with CAS expectedVersion", async () => {
    const pending = allocation({ status: "pending" });
    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: pending,
      version: 1,
      schemaVersion: 1,
      allocationReason: null,
    });

    const reserved = await reserveAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
      },
      TX
    );
    expect(reserved.outcome).toBe("applied");
    expect(reserved.allocation?.status).toBe("reserved");
    expect(mocks.updateMultiCheckAllocation).toHaveBeenCalledWith(
      expect.objectContaining({ status: "reserved" }),
      expect.objectContaining({
        expectedVersion: 1,
        mutationType: "reserve",
      }),
      TX
    );

    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: reserved.allocation!,
      version: 2,
      schemaVersion: 1,
      allocationReason: null,
    });
    mocks.updateMultiCheckAllocation.mockResolvedValue(3);

    const applied = await applyAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
      },
      TX
    );
    expect(applied.allocation?.status).toBe("applied");
    expect(applied.events.map((e) => e.eventType)).toEqual(
      expect.arrayContaining([
        "AllocationApplied",
        "AllocationResponsibilityTransferred",
        "AllocationOutstandingChanged",
      ])
    );

    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: applied.allocation!,
      version: 3,
      schemaVersion: 1,
      allocationReason: null,
    });
    mocks.updateMultiCheckAllocation.mockResolvedValue(4);

    const completed = await completeAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
      },
      TX
    );
    expect(completed.allocation?.status).toBe("completed");
    expect(completed.allocation?.impliesCheckSettlement).toBe(false);
  });

  it("adjusts and reverses via Domain + repository", async () => {
    const applied = allocation({
      status: "applied",
      allocatedAmount: "80.00",
      remainingAmount: "20.00",
      portions: [
        {
          portionId: "por_1",
          allocationId: "alloc_1",
          sequence: 1,
          targetCheckId: 20,
          amount: "80.00",
          applied: true,
          createdAt: AT,
        },
      ],
    });
    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: applied,
      version: 2,
      schemaVersion: 1,
      allocationReason: null,
    });

    const adjusted = await adjustAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
        adjustmentId: "adj_1",
        amount: "20.00",
        direction: "increase",
      },
      TX
    );
    expect(adjusted.allocation?.status).toBe("adjusted");
    expect(adjusted.events.map((e) => e.eventType)).toContain(
      "AllocationAdjusted"
    );

    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: adjusted.allocation!,
      version: 3,
      schemaVersion: 1,
      allocationReason: null,
    });

    const reversed = await reverseAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
        reversalId: "rev_1",
      },
      TX
    );
    expect(reversed.allocation?.status).toBe("reversed");
    expect(reversed.events.map((e) => e.eventType)).toContain(
      "AllocationReversed"
    );
  });

  it("cancels pending Allocation; preserves identity", async () => {
    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: allocation(),
      version: 1,
      schemaVersion: 1,
      allocationReason: null,
    });
    const cancelled = await cancelAllocationOnCheck(
      {
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
      },
      TX
    );
    expect(cancelled.allocation?.status).toBe("cancelled");
    expect(cancelled.allocation?.allocationId).toBe("alloc_1");
    expect(cancelled.allocation?.allocationReference).toBe("aref_1");
  });

  it("rejects mutation from non-source Check", async () => {
    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: allocation({ sourceCheckId: 10 }),
      version: 1,
      schemaVersion: 1,
      allocationReason: null,
    });
    await expect(
      reserveAllocationOnCheck(
        {
          restaurantId: 1,
          checkId: 99,
          allocationId: "alloc_1",
        },
        TX
      )
    ).rejects.toThrow(/sourceCheckId is 10/);
  });

  it("rejects create when Check is not open", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...openCheckRow(),
      outcome: "paid",
    });
    await expect(
      createAllocationOnCheck(
        {
          restaurantId: 1,
          checkId: 10,
          allocationId: "alloc_1",
          allocationReference: "aref_1",
          financialResponsibility: "100.00",
          portions: [
            {
              portionId: "por_1",
              sequence: 1,
              targetCheckId: 20,
              amount: "100.00",
            },
          ],
        },
        TX
      )
    ).rejects.toThrow(/outcome "paid"/);
  });

  it("propagates CAS CONFLICT from repository", async () => {
    mocks.findMultiCheckAllocationByIdentity.mockResolvedValue({
      allocation: allocation(),
      version: 1,
      schemaVersion: 1,
      allocationReason: null,
    });
    mocks.updateMultiCheckAllocation.mockRejectedValue(
      new MultiCheckAllocationPersistenceError("CONFLICT", "cas")
    );
    await expect(
      reserveAllocationOnCheck(
        {
          restaurantId: 1,
          checkId: 10,
          allocationId: "alloc_1",
        },
        TX
      )
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
