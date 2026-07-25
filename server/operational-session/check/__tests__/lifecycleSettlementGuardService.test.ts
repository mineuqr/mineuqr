/**
 * LIFECYCLE-SETTLEMENT-GUARDS-1 — I/O adapter tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveCheckForSession: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
}));

vi.mock("../CheckService", () => ({
  getActiveCheckForSession: (...a: unknown[]) =>
    mocks.getActiveCheckForSession(...a),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  findBlockingMembershipForOrder: (...a: unknown[]) =>
    mocks.findBlockingMembershipForOrder(...a),
}));

import {
  assertOrderCompletable,
  assertSessionCloseable,
} from "../lifecycleSettlementGuardService";
import { LifecycleSettlementGuardError } from "@shared/operational-session";

describe("lifecycleSettlementGuardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assertSessionCloseable rejects open Check", async () => {
    mocks.getActiveCheckForSession.mockResolvedValue({
      id: 1,
      outcome: "open",
    });
    await expect(
      assertSessionCloseable({ restaurantId: 1, sessionId: 9 })
    ).rejects.toBeInstanceOf(LifecycleSettlementGuardError);
  });

  it("assertSessionCloseable accepts paid Check", async () => {
    mocks.getActiveCheckForSession.mockResolvedValue({
      id: 1,
      outcome: "paid",
    });
    await expect(
      assertSessionCloseable({ restaurantId: 1, sessionId: 9 })
    ).resolves.toEqual({ checkId: 1, outcome: "paid" });
  });

  it("assertOrderCompletable skips Waiter sessioned orders", async () => {
    await assertOrderCompletable({
      restaurantId: 1,
      orderId: 2,
      sessionId: 44,
    });
    expect(mocks.findBlockingMembershipForOrder).not.toHaveBeenCalled();
  });

  it("assertOrderCompletable blocks unpaid sessionless", async () => {
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      checkOutcome: "open",
    });
    await expect(
      assertOrderCompletable({
        restaurantId: 1,
        orderId: 2,
        sessionId: null,
      })
    ).rejects.toMatchObject({ code: "ORDER_REQUIRES_SETTLEMENT" });
  });

  it("assertOrderCompletable allows paid sessionless", async () => {
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      checkOutcome: "paid",
    });
    await expect(
      assertOrderCompletable({
        restaurantId: 1,
        orderId: 2,
        sessionId: null,
      })
    ).resolves.toBeUndefined();
  });
});
