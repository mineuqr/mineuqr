/**
 * ORDER-SETTLEMENT-API-1 — router auth, tenant isolation, read-only retrieval.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../../../../_core/context";
import {
  ORDER_SETTLEMENT_PROJECTION_ID,
  ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
} from "@shared/operational-session";

vi.mock("../../../../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

import { assertRestaurantAccess } from "../../../../restaurantAccess";
import { appRouter } from "../../../../routers";
import {
  getOrderSettlementProjectionStore,
  orderSettlementReadService,
} from "../orderSettlementReadComposition";
import { OrderSettlementProjectionUnavailableError } from "../mapOrderSettlementApiError";
import type { InMemoryOrderSettlementProjectionStore } from "../../read/orderSettlementProjectionStore";

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
    getOrderSettlementProjectionStore() as InMemoryOrderSettlementProjectionStore;
  store.clear();
  await store.upsert({
    restaurantId: 42,
    checkId: 100,
    orderId: 55,
    settlementStatus: "settled",
    allocatedAmount: "20.00",
    settledAmount: "20.00",
    outstandingAmount: "0.00",
    orderTotalSnapshot: "20.00",
    isSettled: true,
    isComplimentary: false,
    isVoided: false,
    isRefunded: false,
    isCancelled: false,
    isPartiallySettled: false,
    lastSettlementAt: "2026-07-22T12:00:00.000Z",
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T12:00:00.000Z",
    projectionSchemaVersion: ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-api-1",
  });
}

describe("ORDER-SETTLEMENT-API-1 router", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    await seedProjection();
  });

  it("enforces restaurant access on getByOrder", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.orderSettlement.getByOrder({
      restaurantId: 42,
      checkId: 100,
      orderId: 55,
    });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "orderSettlement.getByOrder"
    );
    expect(result.settlementStatus).toBe("settled");
    expect(result.projection.projectionRevision).toBe("rev-api-1");
    expect(result.projection.projectionId).toBe(ORDER_SETTLEMENT_PROJECTION_ID);
  });

  it("returns NOT_FOUND when projection row missing", async () => {
    const caller = createVerifiedCaller();
    await expect(
      caller.orderSettlement.getByOrder({
        restaurantId: 42,
        checkId: 100,
        orderId: 999,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lists by check and exposes summary + metadata", async () => {
    const caller = createVerifiedCaller();
    const list = await caller.orderSettlement.listByCheck({
      restaurantId: 42,
      checkId: 100,
    });
    expect(list).toHaveLength(1);

    const summary = await caller.orderSettlement.getSummaryByCheck({
      restaurantId: 42,
      checkId: 100,
    });
    expect(summary.settledCount).toBe(1);
    expect(summary.projection.latestProjectionRevision).toBe("rev-api-1");

    const meta = await caller.orderSettlement.getProjectionMetadata({
      restaurantId: 42,
    });
    expect(meta.projectionId).toBe(ORDER_SETTLEMENT_PROJECTION_ID);
    expect(meta.projectionSchemaVersion).toBe(
      ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION
    );
  });

  it("propagates FORBIDDEN from tenant isolation", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );
    const caller = createVerifiedCaller();
    await expect(
      caller.orderSettlement.listByRestaurant({ restaurantId: 99 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("maps projection unavailable to PRECONDITION_FAILED", async () => {
    vi.spyOn(orderSettlementReadService, "listByRestaurant").mockRejectedValueOnce(
      new OrderSettlementProjectionUnavailableError()
    );

    const caller = createVerifiedCaller();
    await expect(
      caller.orderSettlement.listByRestaurant({ restaurantId: 42 })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
