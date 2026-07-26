/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — transport façade tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../../../../_core/context";
import { RefundBudgetExceededError } from "@shared/operational-session";

vi.mock("../../../../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

vi.mock("../../CheckService", () => ({
  getCheckRefundBudget: vi.fn(),
  applyRefundOnCheck: vi.fn(),
}));

import { assertRestaurantAccess } from "../../../../restaurantAccess";
import { appRouter } from "../../../../routers";
import {
  applyRefundOnCheck,
  getCheckRefundBudget,
} from "../../CheckService";

function createVerifiedCaller(userId = 7) {
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

describe("checkRefundRouter REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1", () => {
  beforeEach(() => {
    vi.mocked(assertRestaurantAccess).mockReset();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined as never);
    vi.mocked(getCheckRefundBudget).mockReset();
    vi.mocked(applyRefundOnCheck).mockReset();
  });

  it("getBudget requires restaurant access and maps eligibility", async () => {
    vi.mocked(getCheckRefundBudget).mockResolvedValue({
      settledValue: "100.00",
      appliedRefundTotal: "25.00",
      refundableBalance: "75.00",
      priorSettlementRecordId: "sr:1:10:settlement:1",
      nextRecordGeneration: 2,
    });
    const caller = createVerifiedCaller();
    const budget = await caller.checkRefund.getBudget({
      restaurantId: 42,
      checkId: 10,
    });
    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.anything(),
      42,
      "checkRefund.getBudget"
    );
    expect(budget.eligible).toBe(true);
    expect(budget.refundableBalance).toBe("75.00");
    expect(budget.contractId).toBe("REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1");
  });

  it("getBudget marks ineligible when balance is zero", async () => {
    vi.mocked(getCheckRefundBudget).mockResolvedValue({
      settledValue: "100.00",
      appliedRefundTotal: "100.00",
      refundableBalance: "0.00",
      priorSettlementRecordId: "sr:1:10:settlement:1",
      nextRecordGeneration: 3,
    });
    const caller = createVerifiedCaller();
    const budget = await caller.checkRefund.getBudget({
      restaurantId: 42,
      checkId: 10,
    });
    expect(budget.eligible).toBe(false);
  });

  it("apply delegates to CheckService with register/operator hints", async () => {
    vi.mocked(applyRefundOnCheck).mockResolvedValue({
      outcome: "applied",
      remainingBudget: "50.00",
      settledValue: "100.00",
      appliedRefundTotal: "50.00",
      settlementRecord: {
        settlementRecordId: "sr:1:10:refund:2",
        recordGeneration: 2,
        recordKind: "refund",
      },
      refund: {} as never,
      orderSettlements: [],
      events: [],
      check: {} as never,
      settlementContext: {} as never,
      settlementAttribution: {} as never,
      settlementAttributionEvents: [],
    } as never);

    const caller = createVerifiedCaller(99);
    const result = await caller.checkRefund.applyOnCheck({
      restaurantId: 42,
      checkId: 10,
      amount: "50.00",
      tenderMethod: "cash",
      registerId: "reg_front",
      reason: "guest request",
    });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.anything(),
      42,
      "checkRefund.applyOnCheck"
    );
    expect(applyRefundOnCheck).toHaveBeenCalledWith({
      restaurantId: 42,
      checkId: 10,
      amount: "50.00",
      reason: "guest request",
      tenderMethod: "cash",
      settlementContextHints: {
        registerId: "reg_front",
        operatorUserId: 99,
      },
    });
    expect(result.outcome).toBe("applied");
    expect(result.settlementRecordId).toBe("sr:1:10:refund:2");
    expect(result.recordGeneration).toBe(2);
  });

  it("maps domain budget errors to PRECONDITION_FAILED", async () => {
    vi.mocked(applyRefundOnCheck).mockRejectedValue(
      new RefundBudgetExceededError("budget exceeded")
    );
    const caller = createVerifiedCaller();
    await expect(
      caller.checkRefund.applyOnCheck({
        restaurantId: 42,
        checkId: 10,
        amount: "999.00",
        tenderMethod: "cash",
      })
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    } satisfies Partial<TRPCError>);
  });

  it("denies when restaurant access fails", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "denied" })
    );
    const caller = createVerifiedCaller();
    await expect(
      caller.checkRefund.getBudget({ restaurantId: 42, checkId: 10 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getCheckRefundBudget).not.toHaveBeenCalled();
  });
});
