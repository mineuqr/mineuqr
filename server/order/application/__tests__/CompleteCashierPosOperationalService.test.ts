import { beforeEach, describe, expect, it, vi } from "vitest";
import { LifecycleSettlementGuardError } from "@shared/operational-session";
import { CompleteCashierPosOperationalService } from "../CompleteCashierPosOperationalService";
import type { AdvanceOrderStatusService } from "../AdvanceOrderStatusService";

const guardMocks = vi.hoisted(() => ({
  assertOrderCompletable: vi.fn(),
}));

vi.mock("../../../operational-session/check/lifecycleSettlementGuardService", () => ({
  assertOrderCompletable: (...a: unknown[]) =>
    guardMocks.assertOrderCompletable(...a),
}));

const actor = {
  kind: "user" as const,
  userId: 1,
  dashboardRole: "owner" as const,
  displayName: "Owner",
  restaurantId: 1,
};

describe("CompleteCashierPosOperationalService", () => {
  let advance: AdvanceOrderStatusService;
  let svc: CompleteCashierPosOperationalService;

  beforeEach(() => {
    vi.clearAllMocks();
    guardMocks.assertOrderCompletable.mockResolvedValue(undefined);
    advance = {
      execute: vi.fn(async ({ targetStatus }) => ({
        events: [],
        previousStatus: "ready",
        newStatus: targetStatus,
      })),
    } as unknown as AdvanceOrderStatusService;
    svc = new CompleteCashierPosOperationalService(advance);
  });

  it("refuses the walk for non-cashier channels", async () => {
    await expect(
      svc.execute({
        orderId: 8,
        restaurantId: 1,
        sessionId: null,
        orderingChannel: "kiosk",
        currentStatus: "ready",
        actor,
      })
    ).rejects.toMatchObject({ code: "not_cashier_pos" });
    expect(advance.execute).not.toHaveBeenCalled();
  });

  it("checks settlement before walking so unpaid POS is not left mid-lifecycle", async () => {
    guardMocks.assertOrderCompletable.mockRejectedValue(
      new LifecycleSettlementGuardError(
        "ORDER_REQUIRES_SETTLEMENT",
        "Cannot complete order before settlement."
      )
    );
    await expect(
      svc.execute({
        orderId: 8,
        restaurantId: 1,
        sessionId: null,
        orderingChannel: "cashier_pos",
        currentStatus: "pending",
        actor,
      })
    ).rejects.toMatchObject({ code: "ORDER_REQUIRES_SETTLEMENT" });
    expect(advance.execute).not.toHaveBeenCalled();
  });

  it("walks pending → preparing → ready → served after settlement", async () => {
    const statuses: string[] = [];
    vi.mocked(advance.execute).mockImplementation(async ({ targetStatus }) => {
      statuses.push(targetStatus);
      return {
        events: [],
        previousStatus: "pending",
        newStatus: targetStatus,
      };
    });

    const result = await svc.execute({
      orderId: 8,
      restaurantId: 1,
      sessionId: null,
      orderingChannel: "cashier_pos",
      currentStatus: "pending",
      actor,
    });

    expect(statuses).toEqual(["preparing", "ready", "served"]);
    expect(result).toEqual({ previousStatus: "pending", newStatus: "served" });
  });
});
