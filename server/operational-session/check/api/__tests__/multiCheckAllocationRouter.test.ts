/**
 * MULTI-CHECK-ALLOCATION-API-1 — router auth, tenant isolation, read/write.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../../../../_core/context";
import {
  MULTI_CHECK_ALLOCATION_PROJECTION_ID,
  MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
} from "@shared/operational-session";
import {
  MULTI_CHECK_ALLOCATION_API_CONTRACT_ID,
  MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
} from "../multiCheckAllocationApiDtos";

vi.mock("../../../../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

import { assertRestaurantAccess } from "../../../../restaurantAccess";
import { appRouter } from "../../../../routers";
import {
  getMultiCheckAllocationProjectionStore,
  multiCheckAllocationWriteService,
} from "../multiCheckAllocationApiComposition";
import type { InMemoryMultiCheckAllocationProjectionStore } from "../../read/multiCheckAllocationProjectionStore";

function createVerifiedCaller(userId = 1) {
  return appRouter.createCaller({
    user: {
      id: userId,
      openId: `owner-${userId}`,
      role: "user",
      emailVerifiedAt: new Date(),
    } as TrpcContext["user"],
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

async function seedProjection() {
  const store =
    getMultiCheckAllocationProjectionStore() as InMemoryMultiCheckAllocationProjectionStore;
  store.clear();
  await store.upsertAllocation({
    restaurantId: 42,
    allocationId: "alloc-api-1",
    allocationReference: "AREF-API",
    financialReference: "FREF-API",
    sourceCheckId: 100,
    sourcePaymentId: null,
    allocationStatus: "applied",
    financialResponsibility: "20.00",
    allocatedAmount: "20.00",
    remainingAmount: "0.00",
    paymentValueCap: null,
    allocationRevision: 3,
    isPending: false,
    isReserved: false,
    isApplied: true,
    isAdjusted: false,
    isReversed: false,
    isCompleted: false,
    isCancelled: false,
    isTerminal: false,
    isSuccessTerminal: false,
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    cardinality: "one_to_one",
    sourceCount: 1,
    portionCount: 1,
    adjustmentCount: 0,
    reversalCount: 0,
    targetCheckIds: [200],
    sources: [
      {
        sourceCheckId: 100,
        sourcePaymentId: null,
        financialReference: "FREF-API",
        responsibilityAmount: "20.00",
      },
    ],
    targets: [
      {
        targetCheckId: 200,
        portionId: "p1",
        amount: "20.00",
        applied: true,
      },
    ],
    portions: [
      {
        restaurantId: 42,
        allocationId: "alloc-api-1",
        portionId: "p1",
        sequence: 1,
        targetCheckId: 200,
        amount: "20.00",
        applied: true,
        createdAt: "2026-07-23T12:00:00.000Z",
        allocationRevision: 3,
        financialReference: "FREF-API",
        projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
        projectionRevision: "rev|p",
        projectionTimestamp: "2026-07-23T12:00:00.000Z",
      },
    ],
    adjustments: [],
    reversals: [],
    responsibility: {
      restaurantId: 42,
      allocationId: "alloc-api-1",
      financialResponsibility: "20.00",
      allocatedAmount: "20.00",
      remainingAmount: "0.00",
      allocationRevision: 3,
      financialReference: "FREF-API",
      projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
      projectionRevision: "rev|r",
      projectionTimestamp: "2026-07-23T12:00:00.000Z",
    },
    timeline: [
      {
        kind: "portion",
        id: "p1",
        amount: "20.00",
        at: "2026-07-23T12:00:00.000Z",
        sourceCheckId: 100,
        targetCheckId: 200,
        portionId: "p1",
        direction: null,
      },
    ],
    createdAt: "2026-07-23T11:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-api-1",
    projectionTimestamp: "2026-07-23T12:00:00.000Z",
    metadata: {
      projectionId: MULTI_CHECK_ALLOCATION_PROJECTION_ID,
      projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
      projectionRevision: "rev-api-1",
      projectionTimestamp: "2026-07-23T12:00:00.000Z",
      allocationRevision: 3,
      financialReference: "FREF-API",
      projectedAt: "2026-07-23T12:00:00.000Z",
    },
  });
  await store.upsertSummary({
    restaurantId: 42,
    allocationId: "alloc-api-1",
    allocationReference: "AREF-API",
    financialReference: "FREF-API",
    sourceCheckId: 100,
    sourcePaymentId: null,
    allocationStatus: "applied",
    financialResponsibility: "20.00",
    allocatedAmount: "20.00",
    remainingAmount: "0.00",
    portionCount: 1,
    adjustmentCount: 0,
    reversalCount: 0,
    cardinality: "one_to_one",
    isTerminal: false,
    isCompleted: false,
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    createdAt: "2026-07-23T11:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
    allocationRevision: 3,
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-api-1",
    projectionTimestamp: "2026-07-23T12:00:00.000Z",
  });
}

describe("MULTI-CHECK-ALLOCATION-API-1 router", () => {
  beforeEach(async () => {
    vi.mocked(assertRestaurantAccess).mockReset();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    await seedProjection();
  });

  it("enforces restaurant access on reads and returns Projection DTOs", async () => {
    const caller = createVerifiedCaller();
    const dto = await caller.multiCheckAllocation.getAllocation({
      restaurantId: 42,
      allocationId: "alloc-api-1",
    });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.anything(),
      42,
      "multiCheckAllocation.getAllocation"
    );
    expect(dto.apiContractVersion).toBe(
      MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION
    );
    expect(dto.allocationId).toBe("alloc-api-1");
    expect(dto.projection.projectionRevision).toBe("rev-api-1");
    expect(JSON.stringify(dto)).not.toContain("allocationRevision");

    const list = await caller.multiCheckAllocation.listAllocations({
      restaurantId: 42,
      sourceCheckId: 100,
    });
    expect(list).toHaveLength(1);

    const timeline = await caller.multiCheckAllocation.getAllocationTimeline({
      restaurantId: 42,
      allocationId: "alloc-api-1",
    });
    expect(timeline.entries[0]?.amount).toBe("20.00");

    const summary = await caller.multiCheckAllocation.getAllocationSummary({
      restaurantId: 42,
      allocationId: "alloc-api-1",
    });
    expect(summary.portionCount).toBe(1);

    const responsibility =
      await caller.multiCheckAllocation.getAllocationResponsibility({
        restaurantId: 42,
        allocationId: "alloc-api-1",
      });
    expect(responsibility.remainingAmount).toBe("0.00");

    const catalog = await caller.multiCheckAllocation.getProjectionMetadata({
      restaurantId: 42,
    });
    expect(catalog.apiContractId).toBe(MULTI_CHECK_ALLOCATION_API_CONTRACT_ID);
  });

  it("propagates forbidden restaurant access failures", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValueOnce(
      new TRPCError({ code: "FORBIDDEN", message: "no access" })
    );
    const caller = createVerifiedCaller();
    await expect(
      caller.multiCheckAllocation.getAllocation({
        restaurantId: 42,
        allocationId: "alloc-api-1",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns NOT_FOUND when Projection row is missing", async () => {
    const caller = createVerifiedCaller();
    await expect(
      caller.multiCheckAllocation.getAllocation({
        restaurantId: 42,
        allocationId: "missing",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("delegates write mutations through WriteService with restaurant access", async () => {
    const spy = vi
      .spyOn(multiCheckAllocationWriteService, "createAllocation")
      .mockResolvedValue({
        apiContractVersion: MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
        outcome: "applied",
        allocation: null,
      });

    const caller = createVerifiedCaller();
    const result = await caller.multiCheckAllocation.createAllocation({
      restaurantId: 42,
      checkId: 100,
      allocationId: "alloc-new",
      allocationReference: "AREF-NEW",
      financialResponsibility: "5.00",
      portions: [
        {
          portionId: "p1",
          sequence: 1,
          targetCheckId: 200,
          amount: "5.00",
        },
      ],
    });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.anything(),
      42,
      "multiCheckAllocation.createAllocation"
    );
    expect(spy).toHaveBeenCalledOnce();
    expect(result.outcome).toBe("applied");
    spy.mockRestore();
  });
});
