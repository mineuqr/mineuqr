/**
 * MULTI-CHECK-ALLOCATION-PROJECTION-1 — materializer idempotency / snapshot replace.
 */
import { beforeEach, describe, expect, it } from "vitest";
import type {
  MultiCheckAllocation,
  MultiCheckAllocationCommittedSnapshot,
  MultiCheckAllocationDomainEvent,
} from "@shared/operational-session";
import {
  InMemoryMultiCheckAllocationProjectionStore,
  materializeMultiCheckAllocationProjections,
  tryMaterializeMultiCheckAllocationProjections,
} from "../index";

const AT = "2026-07-23T12:00:00.000Z";

function allocation(
  overrides: Partial<MultiCheckAllocation> = {}
): MultiCheckAllocation {
  return {
    restaurantId: 1,
    allocationId: "alloc_1",
    allocationReference: "aref_1",
    financialReference: null,
    sourceCheckId: 10,
    sourcePaymentId: null,
    status: "applied",
    financialResponsibility: "50.00",
    allocatedAmount: "50.00",
    remainingAmount: "0.00",
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
        portionId: "p1",
        allocationId: "alloc_1",
        sequence: 1,
        targetCheckId: 20,
        amount: "50.00",
        applied: true,
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

function committed(
  overrides: Partial<MultiCheckAllocation> = {},
  allocationRevision = 1
): MultiCheckAllocationCommittedSnapshot {
  return { allocation: allocation(overrides), allocationRevision };
}

describe("MULTI-CHECK-ALLOCATION-PROJECTION-1 materializer", () => {
  let store: InMemoryMultiCheckAllocationProjectionStore;

  beforeEach(() => {
    store = new InMemoryMultiCheckAllocationProjectionStore();
  });

  it("materializes allocation and summary from committed snapshots", async () => {
    const events: MultiCheckAllocationDomainEvent[] = [
      {
        eventType: "AllocationApplied",
        restaurantId: 1,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialReference: null,
        sourceCheckId: 10,
        sourcePaymentId: null,
        occurredAt: AT,
        status: "applied",
        allocatedAmount: "50.00",
        remainingAmount: "0.00",
      },
    ];

    const result = await materializeMultiCheckAllocationProjections(store, {
      committedSnapshots: [committed()],
      events,
      projectionTimestamp: AT,
    });

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]?.allocationId).toBe("alloc_1");
    expect(result.allocations[0]?.allocationRevision).toBe(1);
    expect(result.summaries[0]?.allocatedAmount).toBe("50.00");
    expect(result.appliedEventClaims).toBe(1);

    const loaded = await store.findAllocationByIdentity({
      restaurantId: 1,
      allocationId: "alloc_1",
    });
    expect(loaded?.projectionRevision).toBe(
      result.allocations[0]?.projectionRevision
    );
    expect(loaded?.metadata.projectedAt).toBe(AT);
    expect(loaded?.metadata.allocationRevision).toBe(1);

    const byTarget = await store.listAllocationsByTargetCheck({
      restaurantId: 1,
      targetCheckId: 20,
    });
    expect(byTarget).toHaveLength(1);
  });

  it("idempotent replay skips duplicate event claims and keeps same revision", async () => {
    const events: MultiCheckAllocationDomainEvent[] = [
      {
        eventType: "AllocationCreated",
        restaurantId: 1,
        allocationId: "alloc_1",
        allocationReference: "aref_1",
        financialReference: null,
        sourceCheckId: 10,
        sourcePaymentId: null,
        occurredAt: AT,
        status: "pending",
        financialResponsibility: "50.00",
        portionCount: 1,
      },
    ];
    const first = await materializeMultiCheckAllocationProjections(store, {
      committedSnapshots: [committed()],
      events,
    });
    const second = await materializeMultiCheckAllocationProjections(store, {
      committedSnapshots: [committed()],
      events,
    });
    expect(second.skippedDuplicateEventClaims).toBe(1);
    expect(second.appliedEventClaims).toBe(0);
    expect(second.allocations[0]?.projectionRevision).toBe(
      first.allocations[0]?.projectionRevision
    );
  });

  it("refresh completely replaces prior snapshot — no cross-revision merge", async () => {
    await materializeMultiCheckAllocationProjections(store, {
      committedSnapshots: [committed()],
    });
    const prior = await store.findAllocationByIdentity({
      restaurantId: 1,
      allocationId: "alloc_1",
    });
    expect(prior?.adjustmentCount).toBe(0);
    expect(prior?.allocationRevision).toBe(1);

    const refreshed = await materializeMultiCheckAllocationProjections(store, {
      committedSnapshots: [
        committed(
          {
            status: "adjusted",
            allocatedAmount: "45.00",
            remainingAmount: "5.00",
            financialReference: "fref_next",
            adjustments: [
              {
                adjustmentId: "adj_1",
                allocationId: "alloc_1",
                portionId: "p1",
                amount: "5.00",
                direction: "decrease",
                createdAt: "2026-07-23T12:10:00.000Z",
              },
            ],
            updatedAt: "2026-07-23T12:10:00.000Z",
          },
          2
        ),
      ],
      projectionTimestamp: "2026-07-23T12:10:00.000Z",
    });

    const loaded = await store.findAllocationByIdentity({
      restaurantId: 1,
      allocationId: "alloc_1",
    });
    expect(loaded?.allocationStatus).toBe("adjusted");
    expect(loaded?.allocatedAmount).toBe("45.00");
    expect(loaded?.adjustmentCount).toBe(1);
    expect(loaded?.allocationRevision).toBe(2);
    expect(loaded?.financialReference).toBe("fref_next");
    expect(loaded?.projectionRevision).toBe(
      refreshed.allocations[0]?.projectionRevision
    );
    expect(loaded?.projectionRevision).not.toBe(prior?.projectionRevision);
    expect(loaded?.adjustments[0]?.allocationRevision).toBe(2);
    expect(loaded?.adjustments[0]?.financialReference).toBe("fref_next");
    expect(
      await store.listAllocationsBySourceCheck({
        restaurantId: 1,
        sourceCheckId: 10,
      })
    ).toHaveLength(1);
  });

  it("tryMaterialize isolates store failures from Write Model", async () => {
    const failingStore = {
      upsertAllocation: async () => {
        throw new Error("store down");
      },
      upsertSummary: async () => undefined,
      findAllocationByIdentity: async () => null,
      findSummaryByIdentity: async () => null,
      listAllocationsBySourceCheck: async () => [],
      listAllocationsByTargetCheck: async () => [],
      listAllocationsByRestaurant: async () => [],
      listSummariesBySourceCheck: async () => [],
      hasEventClaim: async () => false,
      recordEventClaim: async () => undefined,
    };

    const result = await tryMaterializeMultiCheckAllocationProjections(
      failingStore,
      { committedSnapshots: [committed()] }
    );
    expect(result).toBeNull();
  });
});
