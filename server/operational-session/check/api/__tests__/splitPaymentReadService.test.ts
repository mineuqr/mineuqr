/**
 * SPLIT-PAYMENT-API-1 — read service over Projection store.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  SPLIT_PAYMENT_PROJECTION_ID,
  SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
  type SplitPaymentAttemptProjection,
  type SplitPaymentOutstandingProjection,
  type SplitPaymentProjection,
} from "@shared/operational-session";
import { SPLIT_PAYMENT_API_CONTRACT_VERSION } from "../splitPaymentApiDtos";
import { InMemorySplitPaymentProjectionStore } from "../../read/splitPaymentProjectionStore";
import { SplitPaymentReadService } from "../splitPaymentReadService";
import { SplitPaymentProjectionUnavailableError } from "../mapSplitPaymentApiError";

function samplePayment(
  overrides: Partial<SplitPaymentProjection> = {}
): SplitPaymentProjection {
  return {
    restaurantId: 1,
    checkId: 100,
    paymentId: "pay-1",
    paymentReference: "PREF-1",
    financialReference: null,
    paymentStatus: "pending",
    amount: "10.00",
    allocatedAmount: "0.00",
    unallocatedAmount: "10.00",
    isPending: true,
    isAuthorized: false,
    isCaptured: false,
    isPartiallyApplied: false,
    isApplied: false,
    isCancelled: false,
    isVoided: false,
    isRefunded: false,
    isFailed: false,
    isValueReceived: false,
    isTerminal: false,
    isPaymentCompleted: false,
    impliesFinancialSettlement: false,
    isFinanciallyComplete: false,
    tenderMethods: [],
    tenderCount: 0,
    tenderAllocationCount: 0,
    allocationCount: 0,
    tenders: [],
    tenderAllocations: [],
    allocations: [],
    timeline: [],
    lastPaymentActivityAt: null,
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-07-22T10:00:00.000Z",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-1",
    projectionTimestamp: "2026-07-22T10:00:00.000Z",
    ...overrides,
  };
}

function sampleAttempt(
  overrides: Partial<SplitPaymentAttemptProjection> = {}
): SplitPaymentAttemptProjection {
  return {
    restaurantId: 1,
    checkId: 100,
    attemptId: "att-1",
    paymentId: "pay-1",
    attemptStatus: "started",
    amount: "10.00",
    method: "card",
    isStarted: true,
    isSucceeded: false,
    isFailed: false,
    isCancelled: false,
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-07-22T10:00:00.000Z",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-att-1",
    projectionTimestamp: "2026-07-22T10:00:00.000Z",
    ...overrides,
  };
}

function sampleOutstanding(
  overrides: Partial<SplitPaymentOutstandingProjection> = {}
): SplitPaymentOutstandingProjection {
  return {
    restaurantId: 1,
    checkId: 100,
    financialResponsibility: "10.00",
    appliedPaymentValue: "0.00",
    outstandingBalance: "10.00",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-out-1",
    projectionTimestamp: "2026-07-22T10:00:00.000Z",
    ...overrides,
  };
}

describe("SPLIT-PAYMENT-API-1 read service", () => {
  let store: InMemorySplitPaymentProjectionStore;
  let service: SplitPaymentReadService;

  beforeEach(() => {
    store = new InMemorySplitPaymentProjectionStore();
    service = new SplitPaymentReadService(store);
  });

  it("retrieves payment by identity from projection store", async () => {
    await store.upsertPayment(samplePayment());
    const dto = await service.getByPayment({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay-1",
    });
    expect(dto?.paymentId).toBe("pay-1");
    expect(dto?.projection.projectionRevision).toBe("rev-1");
    expect(dto?.projection.projectionId).toBe(SPLIT_PAYMENT_PROJECTION_ID);
  });

  it("lists by check / restaurant and isolates tenants", async () => {
    await store.upsertPayment(samplePayment({ paymentId: "pay-1" }));
    await store.upsertPayment(
      samplePayment({ paymentId: "pay-2", projectionRevision: "rev-2" })
    );
    await store.upsertPayment(
      samplePayment({
        restaurantId: 2,
        checkId: 200,
        paymentId: "pay-1",
        projectionRevision: "other",
      })
    );

    const byCheck = await service.listByCheck({
      restaurantId: 1,
      checkId: 100,
    });
    expect(byCheck.map((d) => d.paymentId)).toEqual(["pay-1", "pay-2"]);

    const byRestaurant = await service.listByRestaurant({ restaurantId: 1 });
    expect(byRestaurant).toHaveLength(2);
  });

  it("reads outstanding, timeline, and attempts", async () => {
    await store.upsertPayment(
      samplePayment({
        paymentId: "pay-1",
        timeline: [
          {
            kind: "tender",
            id: "t-1",
            amount: "10.00",
            at: "2026-07-22T10:00:00.000Z",
            method: "card",
            orderId: null,
            tenderId: null,
          },
        ],
      })
    );
    await store.upsertOutstanding(sampleOutstanding());
    await store.upsertAttempt(sampleAttempt());
    await store.upsertAttempt(
      sampleAttempt({ attemptId: "att-2", paymentId: "pay-other" })
    );

    const outstanding = await service.getOutstanding({
      restaurantId: 1,
      checkId: 100,
    });
    expect(outstanding?.outstandingBalance).toBe("10.00");

    const timeline = await service.getTimeline({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay-1",
    });
    expect(timeline?.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(timeline?.entries).toHaveLength(1);

    const attempts = await service.getAttemptsByPayment({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay-1",
    });
    expect(attempts.map((a) => a.attemptId)).toEqual(["att-1"]);

    const byAttempt = await service.getByAttempt({
      restaurantId: 1,
      checkId: 100,
      attemptId: "att-1",
    });
    expect(byAttempt?.method).toBe("card");
  });

  it("builds check summary from projected payment rows", async () => {
    await store.upsertPayment(
      samplePayment({ paymentId: "p1", isPending: true })
    );
    await store.upsertPayment(
      samplePayment({
        paymentId: "p2",
        isPending: false,
        isApplied: true,
        paymentStatus: "applied",
        updatedAt: "2026-07-22T11:00:00.000Z",
        projectionRevision: "rev-applied",
      })
    );

    const summary = await service.getSummaryByCheck({
      restaurantId: 1,
      checkId: 100,
    });
    expect(summary.totalCount).toBe(2);
    expect(summary.pendingCount).toBe(1);
    expect(summary.appliedCount).toBe(1);
    expect(summary.projection.latestProjectionRevision).toBe("rev-applied");
  });

  it("returns identical DTOs for the same projection revision", async () => {
    await store.upsertPayment(samplePayment({ projectionRevision: "same" }));
    const a = await service.getByPayment({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay-1",
    });
    const b = await service.getByPayment({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay-1",
    });
    expect(a).toEqual(b);
  });

  it("maps store failures to ProjectionUnavailable", async () => {
    const failing: InMemorySplitPaymentProjectionStore = Object.assign(
      new InMemorySplitPaymentProjectionStore(),
      {
        findPaymentByIdentity: async () => {
          throw new Error("boom");
        },
      }
    );
    const failingService = new SplitPaymentReadService(failing);
    await expect(
      failingService.getByPayment({
        restaurantId: 1,
        checkId: 100,
        paymentId: "pay-1",
      })
    ).rejects.toBeInstanceOf(SplitPaymentProjectionUnavailableError);
  });

  it("exposes static projection catalog", () => {
    const catalog = service.getProjectionCatalog();
    expect(catalog.projectionId).toBe(SPLIT_PAYMENT_PROJECTION_ID);
    expect(catalog.projectionSchemaVersion).toBe(
      SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION
    );
  });
});
