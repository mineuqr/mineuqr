/**
 * SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — staff settle/cancel unit tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
  settleCheckPaidByIdDetailed: vi.fn(),
  voidCheckByIdDetailed: vi.fn(),
  listSettlementRecordsForCheck: vi.fn(),
  resolveSettlementContextForSettle: vi.fn(),
  tryMaterializeOrderSettlementProjections: vi.fn(),
  advanceExecute: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getDb: (...a: unknown[]) => mocks.getDb(...a),
}));

vi.mock("../../../../drizzle/schema", () => ({
  operationalChecks: {},
  checkOrderMembership: {},
  orders: {},
}));

vi.mock("../../../operational-session/check", () => ({
  CheckTransitionError: class CheckTransitionError extends Error {},
  findBlockingMembershipForOrder: (...a: unknown[]) =>
    mocks.findBlockingMembershipForOrder(...a),
  settleCheckPaidByIdDetailed: (...a: unknown[]) =>
    mocks.settleCheckPaidByIdDetailed(...a),
  voidCheckByIdDetailed: (...a: unknown[]) =>
    mocks.voidCheckByIdDetailed(...a),
}));

vi.mock("../../../operational-session/check/settlementRecordRepository", () => ({
  listSettlementRecordsForCheck: (...a: unknown[]) =>
    mocks.listSettlementRecordsForCheck(...a),
}));

vi.mock("../../../crmp/SettlementContextResolver", () => ({
  resolveSettlementContextForSettle: (...a: unknown[]) =>
    mocks.resolveSettlementContextForSettle(...a),
}));

vi.mock(
  "../../../operational-session/check/read/orderSettlementProjectionMaterializer",
  () => ({
    tryMaterializeOrderSettlementProjections: (...a: unknown[]) =>
      mocks.tryMaterializeOrderSettlementProjections(...a),
  })
);

vi.mock(
  "../../../operational-session/check/api/orderSettlementReadComposition",
  () => ({
    getOrderSettlementProjectionStore: () => ({}),
  })
);

vi.mock("../../composition", () => ({
  advanceOrderStatusService: {
    execute: (...a: unknown[]) => mocks.advanceExecute(...a),
  },
}));

import {
  cancelCounterPickupUnpaid,
  settleCounterPickupPaid,
  StaffCounterPickupError,
} from "../StaffCounterPickupSettlementService";

const actor = {
  kind: "user" as const,
  userId: 9,
  dashboardRole: "staff" as const,
  displayName: "Cashier",
  restaurantId: 1,
};

describe("StaffCounterPickupSettlementService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrderById.mockResolvedValue({
      id: 42,
      restaurantId: 1,
      status: "preparing",
      trackingToken: "tok",
    });
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      membership: { checkId: 7, orderId: 42 },
      checkOutcome: "open",
    });
    mocks.resolveSettlementContextForSettle.mockResolvedValue({
      restaurantId: 1,
      registerId: "reg_1",
      financialShiftId: "fsh_1",
      operatorUserId: 9,
      deviceId: null,
      operationalScreenId: null,
      resolvedAt: new Date().toISOString(),
      availability: "available",
      reasons: [],
    });
    mocks.settleCheckPaidByIdDetailed.mockResolvedValue({
      check: { id: 7, outcome: "paid" },
      orderSettlement: { settlements: [] },
      orderSettlementEvents: [],
      settlementRecord: {
        outcome: "created",
        record: {
          settlementRecordId: "sr_1",
          grandTotal: "25.00",
          currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
          paymentSnapshot: [{ paymentMethod: "cash", amount: "25.00" }],
        },
      },
      settlementContext: {
        restaurantId: 1,
        registerId: "reg_1",
        financialShiftId: "fsh_1",
        operatorUserId: 9,
      },
    });
    mocks.tryMaterializeOrderSettlementProjections.mockResolvedValue(undefined);
    mocks.voidCheckByIdDetailed.mockResolvedValue({
      check: { id: 7, outcome: "voided" },
    });
    mocks.advanceExecute.mockResolvedValue({
      previousStatus: "preparing",
      newStatus: "cancelled",
      events: [],
    });
  });

  it("settles via settleCheckPaidByIdDetailed when Register + Shift resolved", async () => {
    const result = await settleCounterPickupPaid({
      restaurantId: 1,
      orderId: 42,
      operatorUserId: 9,
      registerId: "reg_1",
      settlements: [{ paymentMethod: "cash" }],
    });
    expect(mocks.settleCheckPaidByIdDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        checkId: 7,
        settlementContextHints: expect.objectContaining({
          registerId: "reg_1",
          operatorUserId: 9,
        }),
      })
    );
    expect(result.settlementRecordId).toBe("sr_1");
    expect(result.alreadySettled).toBe(false);
  });

  it("rejects settle without open Financial Shift (CSA-03)", async () => {
    mocks.resolveSettlementContextForSettle.mockResolvedValue({
      restaurantId: 1,
      registerId: "reg_1",
      financialShiftId: null,
      operatorUserId: 9,
      availability: "partial",
      reasons: ["no_active_shift"],
    });
    await expect(
      settleCounterPickupPaid({
        restaurantId: 1,
        orderId: 42,
        operatorUserId: 9,
        registerId: "reg_1",
      })
    ).rejects.toMatchObject({ code: "SHIFT_REQUIRED" });
    expect(mocks.settleCheckPaidByIdDetailed).not.toHaveBeenCalled();
  });

  it("rejects empty registerId", async () => {
    await expect(
      settleCounterPickupPaid({
        restaurantId: 1,
        orderId: 42,
        operatorUserId: 9,
        registerId: "  ",
      })
    ).rejects.toBeInstanceOf(StaffCounterPickupError);
  });

  it("cancels by voiding unpaid Check then cancelling Order", async () => {
    const result = await cancelCounterPickupUnpaid({
      restaurantId: 1,
      orderId: 42,
      operatorUserId: 9,
      actor,
      registerId: "reg_1",
    });
    expect(mocks.voidCheckByIdDetailed).toHaveBeenCalledWith(
      expect.objectContaining({ checkId: 7, restaurantId: 1 })
    );
    expect(mocks.advanceExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 42,
        targetStatus: "cancelled",
      })
    );
    expect(result.checkOutcome).toBe("voided");
    expect(result.orderStatus).toBe("cancelled");
  });

  it("blocks cancel after paid (CSA-06)", async () => {
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      membership: { checkId: 7, orderId: 42 },
      checkOutcome: "paid",
    });
    await expect(
      cancelCounterPickupUnpaid({
        restaurantId: 1,
        orderId: 42,
        operatorUserId: 9,
        actor,
      })
    ).rejects.toMatchObject({ code: "ALREADY_SETTLED" });
    expect(mocks.voidCheckByIdDetailed).not.toHaveBeenCalled();
  });
});
