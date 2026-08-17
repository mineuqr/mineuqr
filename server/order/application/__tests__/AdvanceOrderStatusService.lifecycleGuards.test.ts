/**
 * LIFECYCLE-SETTLEMENT-GUARDS-1 — Order complete requires settlement when sessionless.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LifecycleSettlementGuardError } from "@shared/operational-session";
import { AdvanceOrderStatusService } from "../AdvanceOrderStatusService";
import type { OrderRepository } from "../../repositories/OrderRepository";

const guardMocks = vi.hoisted(() => ({
  assertOrderCompletable: vi.fn(),
}));

vi.mock("../../../operational-session/check/lifecycleSettlementGuardService", () => ({
  assertOrderCompletable: (...a: unknown[]) =>
    guardMocks.assertOrderCompletable(...a),
}));

function makeOrder(overrides: {
  id?: number;
  restaurantId?: number;
  sessionId?: number | null;
  status?: string;
} = {}) {
  const status = overrides.status ?? "ready";
  return {
    id: overrides.id ?? 7,
    restaurantId: overrides.restaurantId ?? 1,
    sessionId: overrides.sessionId === undefined ? null : overrides.sessionId,
    status,
    lifecycleStage: "active",
    toPersistedProps: () => ({ updatedAt: "2026-07-25 12:00:00" }),
    advanceStatus: vi.fn(),
    advanceLifecycleStage: vi.fn(),
    pullDomainEvents: vi.fn(() => []),
    clearDomainEvents: vi.fn(),
  };
}

describe("AdvanceOrderStatusService LIFECYCLE-SETTLEMENT-GUARDS-1", () => {
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

  it("blocks served for unpaid sessionless Self Ordering / Counter Pickup", async () => {
    const order = makeOrder({ sessionId: null, status: "ready" });
    vi.mocked(repo.findById).mockResolvedValue(order as never);
    guardMocks.assertOrderCompletable.mockRejectedValue(
      new LifecycleSettlementGuardError(
        "ORDER_REQUIRES_SETTLEMENT",
        "Cannot complete order before settlement."
      )
    );

    await expect(
      svc.execute({
        orderId: 7,
        targetStatus: "served",
        actor: { type: "staff", userId: 1 } as never,
      })
    ).rejects.toMatchObject({ code: "ORDER_REQUIRES_SETTLEMENT" });
    expect(order.advanceStatus).not.toHaveBeenCalled();
  });

  it("allows served after settlement for sessionless", async () => {
    const order = makeOrder({ sessionId: null, status: "ready" });
    vi.mocked(repo.findById).mockResolvedValue(order as never);
    guardMocks.assertOrderCompletable.mockResolvedValue(undefined);

    const result = await svc.execute({
      orderId: 7,
      targetStatus: "served",
      actor: { type: "staff", userId: 1 } as never,
    });

    expect(guardMocks.assertOrderCompletable).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 7,
      sessionId: null,
    });
    expect(order.advanceStatus).toHaveBeenCalled();
    expect(result.newStatus).toBe("served");
  });

  it("allows Waiter / Table QR served while unpaid (no regression)", async () => {
    const order = makeOrder({ sessionId: 55, status: "ready" });
    vi.mocked(repo.findById).mockResolvedValue(order as never);

    await svc.execute({
      orderId: 7,
      targetStatus: "served",
      actor: { type: "staff", userId: 1 } as never,
    });

    expect(guardMocks.assertOrderCompletable).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 7,
      sessionId: 55,
    });
    expect(order.advanceStatus).toHaveBeenCalled();
  });

  it("idempotent served request skips guard and completes leftover active lifecycle", async () => {
    const order = makeOrder({ sessionId: null, status: "served" });
    vi.mocked(repo.findById).mockResolvedValue(order as never);

    const result = await svc.execute({
      orderId: 7,
      targetStatus: "served",
      actor: { type: "staff", userId: 1 } as never,
    });

    expect(guardMocks.assertOrderCompletable).not.toHaveBeenCalled();
    expect(order.advanceStatus).not.toHaveBeenCalled();
    expect(order.advanceLifecycleStage).toHaveBeenCalledWith(
      "completed",
      expect.any(String)
    );
    expect(repo.save).toHaveBeenCalled();
    expect(result.newStatus).toBe("served");
  });

  it("does not gate cancel (pre-settlement cancel remains allowed)", async () => {
    const order = makeOrder({ sessionId: null, status: "ready" });
    vi.mocked(repo.findById).mockResolvedValue(order as never);

    await svc.execute({
      orderId: 7,
      targetStatus: "cancelled",
      actor: { type: "staff", userId: 1 } as never,
    });

    expect(guardMocks.assertOrderCompletable).not.toHaveBeenCalled();
    expect(order.advanceStatus).toHaveBeenCalled();
  });
});
