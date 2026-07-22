/**
 * SPLIT-PAYMENT-API-1 — router auth, tenant isolation, read-only retrieval.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../../../../_core/context";
import {
  SPLIT_PAYMENT_PROJECTION_ID,
  SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
} from "@shared/operational-session";
import {
  SPLIT_PAYMENT_API_CONTRACT_ID,
  SPLIT_PAYMENT_API_CONTRACT_VERSION,
} from "../splitPaymentApiDtos";

vi.mock("../../../../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

import { assertRestaurantAccess } from "../../../../restaurantAccess";
import { appRouter } from "../../../../routers";
import {
  getSplitPaymentProjectionStore,
  splitPaymentReadService,
} from "../splitPaymentReadComposition";
import { SplitPaymentProjectionUnavailableError } from "../mapSplitPaymentApiError";
import type { InMemorySplitPaymentProjectionStore } from "../../read/splitPaymentProjectionStore";

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
    getSplitPaymentProjectionStore() as InMemorySplitPaymentProjectionStore;
  store.clear();
  await store.upsertPayment({
    restaurantId: 42,
    checkId: 100,
    paymentId: "pay-api-1",
    paymentReference: "PREF-API",
    financialReference: null,
    paymentStatus: "applied",
    amount: "20.00",
    allocatedAmount: "20.00",
    unallocatedAmount: "0.00",
    isPending: false,
    isAuthorized: false,
    isCaptured: false,
    isPartiallyApplied: false,
    isApplied: true,
    isCancelled: false,
    isVoided: false,
    isRefunded: false,
    isFailed: false,
    isValueReceived: true,
    isTerminal: true,
    isPaymentCompleted: true,
    impliesFinancialSettlement: false,
    isFinanciallyComplete: false,
    tenderMethods: ["cash"],
    tenderCount: 1,
    tenderAllocationCount: 0,
    allocationCount: 1,
    tenders: [
      {
        tenderId: "t-1",
        method: "cash",
        amount: "20.00",
        createdAt: "2026-07-22T11:00:00.000Z",
      },
    ],
    tenderAllocations: [],
    allocations: [
      {
        allocationId: "a-1",
        orderId: 55,
        amount: "20.00",
        createdAt: "2026-07-22T11:05:00.000Z",
      },
    ],
    timeline: [
      {
        kind: "tender",
        id: "t-1",
        amount: "20.00",
        at: "2026-07-22T11:00:00.000Z",
        method: "cash",
        orderId: null,
        tenderId: null,
      },
    ],
    lastPaymentActivityAt: "2026-07-22T11:05:00.000Z",
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T11:05:00.000Z",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-api-1",
    projectionTimestamp: "2026-07-22T12:00:00.000Z",
  });
  await store.upsertOutstanding({
    restaurantId: 42,
    checkId: 100,
    financialResponsibility: "20.00",
    appliedPaymentValue: "20.00",
    outstandingBalance: "0.00",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-out-api-1",
    projectionTimestamp: "2026-07-22T12:00:00.000Z",
  });
  await store.upsertAttempt({
    restaurantId: 42,
    checkId: 100,
    attemptId: "att-api-1",
    paymentId: "pay-api-1",
    attemptStatus: "succeeded",
    amount: "20.00",
    method: "cash",
    isStarted: false,
    isSucceeded: true,
    isFailed: false,
    isCancelled: false,
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T11:00:00.000Z",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-att-api-1",
    projectionTimestamp: "2026-07-22T12:00:00.000Z",
  });
}

describe("SPLIT-PAYMENT-API-1 router", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    await seedProjection();
  });

  it("enforces restaurant access on getByPayment", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.splitPayment.getByPayment({
      restaurantId: 42,
      checkId: 100,
      paymentId: "pay-api-1",
    });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "splitPayment.getByPayment"
    );
    expect(result.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(result.paymentStatus).toBe("applied");
    expect(result.projection.projectionRevision).toBe("rev-api-1");
    expect(result.projection.projectionId).toBe(SPLIT_PAYMENT_PROJECTION_ID);
    expect(result.projection.projectedAt).toBe("2026-07-22T12:00:00.000Z");
    expect(result).toHaveProperty("apiContractVersion");
    expect(result.projection).not.toHaveProperty("apiContractVersion");
  });

  it("returns NOT_FOUND when projection row missing", async () => {
    const caller = createVerifiedCaller();
    await expect(
      caller.splitPayment.getByPayment({
        restaurantId: 42,
        checkId: 100,
        paymentId: "missing",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lists by check and exposes outstanding, attempts, summary, metadata", async () => {
    const caller = createVerifiedCaller();
    const list = await caller.splitPayment.listByCheck({
      restaurantId: 42,
      checkId: 100,
    });
    expect(list).toHaveLength(1);

    const byCheck = await caller.splitPayment.getByCheck({
      restaurantId: 42,
      checkId: 100,
    });
    expect(byCheck).toEqual(list);

    const outstanding = await caller.splitPayment.getOutstanding({
      restaurantId: 42,
      checkId: 100,
    });
    expect(outstanding.outstandingBalance).toBe("0.00");

    const timeline = await caller.splitPayment.getTimeline({
      restaurantId: 42,
      checkId: 100,
      paymentId: "pay-api-1",
    });
    expect(timeline.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(timeline.entries).toHaveLength(1);

    const attempts = await caller.splitPayment.getAttempts({
      restaurantId: 42,
      checkId: 100,
      paymentId: "pay-api-1",
    });
    expect(attempts).toHaveLength(1);

    const summary = await caller.splitPayment.getSummaryByCheck({
      restaurantId: 42,
      checkId: 100,
    });
    expect(summary.appliedCount).toBe(1);
    expect(summary.projection.latestProjectionRevision).toBe("rev-api-1");

    const meta = await caller.splitPayment.getProjectionMetadata({
      restaurantId: 42,
    });
    expect(meta.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(meta.apiContractId).toBe(SPLIT_PAYMENT_API_CONTRACT_ID);
    expect(meta.projectionId).toBe(SPLIT_PAYMENT_PROJECTION_ID);
    expect(meta.projectionSchemaVersion).toBe(
      SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION
    );
    expect(meta).toHaveProperty("apiContractVersion");
    expect(meta).toHaveProperty("projectionSchemaVersion");
  });

  it("propagates FORBIDDEN from tenant isolation", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );
    const caller = createVerifiedCaller();
    await expect(
      caller.splitPayment.listByRestaurant({ restaurantId: 99 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("maps projection unavailable to PRECONDITION_FAILED", async () => {
    vi.spyOn(splitPaymentReadService, "listByRestaurant").mockRejectedValueOnce(
      new SplitPaymentProjectionUnavailableError()
    );

    const caller = createVerifiedCaller();
    await expect(
      caller.splitPayment.listByRestaurant({ restaurantId: 42 })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("returns identical responses for repeated reads at same revision", async () => {
    const caller = createVerifiedCaller();
    const a = await caller.splitPayment.getByPayment({
      restaurantId: 42,
      checkId: 100,
      paymentId: "pay-api-1",
    });
    const b = await caller.splitPayment.getByPayment({
      restaurantId: 42,
      checkId: 100,
      paymentId: "pay-api-1",
    });
    expect(a).toEqual(b);
  });
});
