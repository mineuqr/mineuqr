/**
 * PAYMENT-CONFIRM-SERVICE-1 — façade delegates to certified settle.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  settleCheckPaidByIdDetailed: vi.fn(),
  opsLog: vi.fn(),
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: (...a: unknown[]) => mocks.opsLog(...a),
}));

vi.mock("../../check/CheckService", () => ({
  settleCheckPaidByIdDetailed: (...a: unknown[]) =>
    mocks.settleCheckPaidByIdDetailed(...a),
}));

import { confirmPayment } from "../PaymentConfirmService";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";

const FINANCIAL = {
  check: {
    id: 100,
    restaurantId: 1,
    sessionId: null,
    outcome: "paid",
    grandTotal: "42.50",
  },
  settlementRecord: { record: { settlementRecordId: "sr-1" } },
};

describe("confirmPayment", () => {
  beforeEach(() => {
    mocks.settleCheckPaidByIdDetailed.mockReset();
    mocks.opsLog.mockReset();
    mocks.settleCheckPaidByIdDetailed.mockResolvedValue(FINANCIAL);
  });

  it("forwards the confirm command to settleCheckPaidByIdDetailed and returns that result", async () => {
    const settlements = [{ paymentMethod: "cash" as const, amount: "42.50" }];
    const result = await confirmPayment({
      restaurantId: 1,
      checkId: 100,
      settlements,
      settlementContextHints: {
        registerId: "reg_1",
        operatorUserId: 7,
      },
      awaitAttribution: false,
    });
    expect(mocks.settleCheckPaidByIdDetailed).toHaveBeenCalledTimes(1);
    expect(mocks.settleCheckPaidByIdDetailed).toHaveBeenCalledWith({
      restaurantId: 1,
      checkId: 100,
      settlements,
      settlementContext: undefined,
      settlementContextHints: {
        registerId: "reg_1",
        operatorUserId: 7,
      },
      awaitAttribution: false,
    });
    expect(result).toBe(FINANCIAL);
    expect(mocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.payment_confirm,
        category: "PAYMENT",
        action: "payment.confirm",
        restaurantId: 1,
        metadata: expect.objectContaining({
          checkId: 100,
          outcome: "paid",
          awaitAttribution: false,
        }),
      })
    );
  });

  it("propagates certified settle errors without wrapping them", async () => {
    const err = new Error("Cannot finalize check from outcome paid");
    mocks.settleCheckPaidByIdDetailed.mockRejectedValue(err);
    await expect(
      confirmPayment({ restaurantId: 1, checkId: 100 })
    ).rejects.toBe(err);
    expect(mocks.opsLog).not.toHaveBeenCalled();
  });
});
