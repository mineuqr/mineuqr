/**
 * CASHIER-ORDER-AND-CHECKOUT-LATENCY-FORENSICS-1
 * One load + one persist for consecutive cashier_pos serve steps.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdvanceOrderStatusService } from "../AdvanceOrderStatusService";
import type { OrderRepository } from "../../repositories/OrderRepository";

const guardMocks = vi.hoisted(() => ({
  assertOrderCompletable: vi.fn(),
}));

vi.mock("../../../operational-session/check/lifecycleSettlementGuardService", () => ({
  assertOrderCompletable: (...a: unknown[]) =>
    guardMocks.assertOrderCompletable(...a),
}));

function makeWalkOrder(startStatus: string, startLifecycle = "active") {
  let status = startStatus;
  let lifecycleStage = startLifecycle;
  const events: unknown[] = [];
  return {
    id: 8,
    restaurantId: 1,
    sessionId: null,
    get status() {
      return status;
    },
    get lifecycleStage() {
      return lifecycleStage;
    },
    toPersistedProps: () => ({ updatedAt: "2026-08-18 02:00:00" }),
    advanceStatus: vi.fn((target: string) => {
      events.push({ type: "OrderStatusChanged", toStatus: target });
      status = target;
    }),
    advanceLifecycleStage: vi.fn((stage: string) => {
      events.push({ type: "OrderLifecycleStageChanged", toStage: stage });
      lifecycleStage = stage;
    }),
    pullDomainEvents: vi.fn(() => [...events.splice(0, events.length)]),
    clearDomainEvents: vi.fn(),
  };
}

describe("AdvanceOrderStatusService.executeSequential", () => {
  let repo: OrderRepository;
  let svc: AdvanceOrderStatusService;

  beforeEach(() => {
    vi.clearAllMocks();
    guardMocks.assertOrderCompletable.mockResolvedValue(undefined);
    repo = {
      findById: vi.fn(),
      save: vi.fn(async () => undefined),
    } as unknown as OrderRepository;
    svc = new AdvanceOrderStatusService(repo);
  });

  it("persists preparing → ready → served + completed once", async () => {
    const order = makeWalkOrder("preparing");
    vi.mocked(repo.findById).mockResolvedValue(order as never);

    const result = await svc.executeSequential({
      orderId: 8,
      targetStatuses: ["ready", "served"],
      actor: { type: "staff", userId: 1 } as never,
    });

    expect(order.advanceStatus).toHaveBeenCalledTimes(2);
    expect(order.advanceLifecycleStage).toHaveBeenCalledWith(
      "completed",
      expect.any(String)
    );
    expect(repo.findById).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(guardMocks.assertOrderCompletable).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      previousStatus: "preparing",
      newStatus: "served",
    });
  });

  it("does not save when every target is already applied", async () => {
    const order = makeWalkOrder("served", "completed");
    vi.mocked(repo.findById).mockResolvedValue(order as never);

    const result = await svc.executeSequential({
      orderId: 8,
      targetStatuses: ["served"],
      actor: { type: "staff", userId: 1 } as never,
    });

    expect(order.advanceStatus).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(result.newStatus).toBe("served");
  });
});
