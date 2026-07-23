/**
 * MULTI-CHECK-ALLOCATION-API-1 — write service delegates to Integration.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MULTI_CHECK_ALLOCATION_PROJECTION_ID,
  MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
  type MultiCheckAllocation,
} from "@shared/operational-session";
import { InMemoryMultiCheckAllocationProjectionStore } from "../../read/multiCheckAllocationProjectionStore";
import { MultiCheckAllocationReadService } from "../multiCheckAllocationReadService";
import { MultiCheckAllocationWriteService } from "../multiCheckAllocationWriteService";

const createMultiCheckAllocationOnCheck = vi.fn();
const reserveMultiCheckAllocationOnCheck = vi.fn();
const applyMultiCheckAllocationOnCheck = vi.fn();

vi.mock("../../CheckService", () => ({
  createMultiCheckAllocationOnCheck: (...args: unknown[]) =>
    createMultiCheckAllocationOnCheck(...args),
  reserveMultiCheckAllocationOnCheck: (...args: unknown[]) =>
    reserveMultiCheckAllocationOnCheck(...args),
  applyMultiCheckAllocationOnCheck: (...args: unknown[]) =>
    applyMultiCheckAllocationOnCheck(...args),
  adjustMultiCheckAllocationOnCheck: vi.fn(),
  reverseMultiCheckAllocationOnCheck: vi.fn(),
  completeMultiCheckAllocationOnCheck: vi.fn(),
  cancelMultiCheckAllocationOnCheck: vi.fn(),
}));

function allocation(): MultiCheckAllocation {
  return {
    restaurantId: 1,
    allocationId: "alloc-w-1",
    allocationReference: "AREF-W",
    financialReference: "FREF-W",
    sourceCheckId: 10,
    sourcePaymentId: null,
    status: "pending",
    financialResponsibility: "25.00",
    allocatedAmount: "0.00",
    remainingAmount: "25.00",
    paymentValueCap: null,
    sources: [
      {
        sourceCheckId: 10,
        sourcePaymentId: null,
        financialReference: "FREF-W",
        responsibilityAmount: "25.00",
      },
    ],
    portions: [
      {
        portionId: "p1",
        allocationId: "alloc-w-1",
        sequence: 1,
        targetCheckId: 20,
        amount: "25.00",
        applied: false,
        createdAt: "2026-07-23T12:00:00.000Z",
      },
    ],
    adjustments: [],
    reversals: [],
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
  };
}

describe("MULTI-CHECK-ALLOCATION-API-1 write service", () => {
  let store: InMemoryMultiCheckAllocationProjectionStore;
  let service: MultiCheckAllocationWriteService;

  beforeEach(() => {
    store = new InMemoryMultiCheckAllocationProjectionStore();
    service = new MultiCheckAllocationWriteService(
      store,
      new MultiCheckAllocationReadService(store)
    );
    createMultiCheckAllocationOnCheck.mockReset();
    reserveMultiCheckAllocationOnCheck.mockReset();
    applyMultiCheckAllocationOnCheck.mockReset();
  });

  it("delegates create to Integration and materializes Projection", async () => {
    createMultiCheckAllocationOnCheck.mockResolvedValue({
      check: { id: 10 },
      allocation: allocation(),
      version: 1,
      outcome: "applied",
      events: [],
    });

    const result = await service.createAllocation({
      restaurantId: 1,
      checkId: 10,
      allocationId: "alloc-w-1",
      allocationReference: "AREF-W",
      financialResponsibility: "25.00",
      portions: [
        {
          portionId: "p1",
          sequence: 1,
          targetCheckId: 20,
          amount: "25.00",
        },
      ],
    });

    expect(createMultiCheckAllocationOnCheck).toHaveBeenCalledOnce();
    expect(result.outcome).toBe("applied");
    expect(result.allocation?.allocationId).toBe("alloc-w-1");
    expect(result.allocation?.projection.projectionId).toBe(
      MULTI_CHECK_ALLOCATION_PROJECTION_ID
    );
    expect(result.allocation?.projection.projectionSchemaVersion).toBe(
      MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION
    );

    const stored = await store.findAllocationByIdentity({
      restaurantId: 1,
      allocationId: "alloc-w-1",
    });
    expect(stored?.allocationRevision).toBe(1);
  });

  it("preserves ADR-021 already_applied outcome without inventing state", async () => {
    const entity = allocation();
    createMultiCheckAllocationOnCheck.mockResolvedValue({
      check: { id: 10 },
      allocation: entity,
      version: 1,
      outcome: "applied",
      events: [],
    });
    await service.createAllocation({
      restaurantId: 1,
      checkId: 10,
      allocationId: "alloc-w-1",
      allocationReference: "AREF-W",
      financialResponsibility: "25.00",
      portions: [
        {
          portionId: "p1",
          sequence: 1,
          targetCheckId: 20,
          amount: "25.00",
        },
      ],
    });

    createMultiCheckAllocationOnCheck.mockResolvedValue({
      check: { id: 10 },
      allocation: entity,
      version: 1,
      outcome: "already_applied",
      events: [],
    });

    const duplicate = await service.createAllocation({
      restaurantId: 1,
      checkId: 10,
      allocationId: "alloc-w-1",
      allocationReference: "AREF-W",
      financialResponsibility: "25.00",
      portions: [
        {
          portionId: "p1",
          sequence: 1,
          targetCheckId: 20,
          amount: "25.00",
        },
      ],
    });

    expect(duplicate.outcome).toBe("already_applied");
    expect(duplicate.allocation?.allocationId).toBe("alloc-w-1");
  });
});
