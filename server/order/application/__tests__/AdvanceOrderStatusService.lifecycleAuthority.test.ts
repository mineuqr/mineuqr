/**
 * ORDER-LIFECYCLE-GUARD-1 — AdvanceOrderStatusService is the mutation authority.
 * Uses a real Order aggregate so invalid transitions cannot be mocked away.
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdvanceOrderStatusService } from "../AdvanceOrderStatusService";
import { Order } from "../../domain/aggregate/Order";
import {
  InvalidTransitionError,
  OrderAlreadyCompletedError,
} from "../../domain/errors/OrderDomainErrors";
import type { OrderRepository } from "../../repositories/OrderRepository";
import type { OrderStatus } from "../../domain/value-objects/OrderStatus";
import type { UserActor } from "../../domain/value-objects/OrderActor";

const guardMocks = vi.hoisted(() => ({
  assertOrderCompletable: vi.fn(),
}));

vi.mock("../../../operational-session/check/lifecycleSettlementGuardService", () => ({
  assertOrderCompletable: (...a: unknown[]) =>
    guardMocks.assertOrderCompletable(...a),
}));

const actor: UserActor = {
  kind: "user",
  userId: 1,
  dashboardRole: "staff",
  displayName: "Staff",
  restaurantId: 1,
};

function realOrder(status: OrderStatus) {
  return Order.reconstitute({
    id: 21,
    restaurantId: 1,
    tableId: 1,
    tableNumber: 1,
    sessionId: 8,
    customerName: null,
    customerPhone: null,
    notes: null,
    totalAmount: "10.00",
    orderNumber: "ORD-21",
    trackingToken: "tok-21",
    createdAt: "2026-08-29T12:00:00.000Z",
    updatedAt: "2026-08-29 12:00:00",
    status,
    lifecycleStage: status === "served" || status === "cancelled" ? "completed" : "active",
    readyAt: status === "ready" || status === "served" ? "2026-08-29 12:05:00" : null,
    lines: [
      {
        menuItemId: 1,
        nameAr: "item",
        nameEn: null,
        unitPrice: "10.00",
        quantity: 1,
        notes: null,
      },
    ],
  });
}

describe("ORDER-LIFECYCLE-GUARD-1 AdvanceOrderStatusService authority", () => {
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

  async function run(from: OrderStatus, to: OrderStatus) {
    const order = realOrder(from);
    vi.mocked(repo.findById).mockResolvedValue(order);
    return { order, result: await svc.execute({ orderId: 21, targetStatus: to, actor }) };
  }

  it("persists pending → preparing with OrderStatusChanged", async () => {
    const { order, result } = await run("pending", "preparing");
    expect(result.previousStatus).toBe("pending");
    expect(result.newStatus).toBe("preparing");
    expect(order.status).toBe("preparing");
    expect(result.events.filter((e) => e.type === "OrderStatusChanged")).toHaveLength(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saveOpts = vi.mocked(repo.save).mock.calls[0]?.[1];
    expect(saveOpts?.expectedUpdatedAt).toBe("2026-08-29 12:00:00");
    expect(saveOpts?.domainEvents?.some((e) => e.type === "OrderStatusChanged")).toBe(
      true
    );
  });

  it("persists preparing → ready and ready → served", async () => {
    const ready = await run("preparing", "ready");
    expect(ready.result.newStatus).toBe("ready");
    expect(guardMocks.assertOrderCompletable).not.toHaveBeenCalled();
    const served = await run("ready", "served");
    expect(served.result.newStatus).toBe("served");
    expect(served.result.events.some((e) => e.type === "OrderStatusChanged")).toBe(true);
  });

  it("rejects served → ready and treats a second Ready as idempotent", async () => {
    const served = realOrder("served");
    vi.mocked(repo.findById).mockResolvedValue(served);
    await expect(
      svc.execute({ orderId: 21, targetStatus: "ready", actor })
    ).rejects.toBeInstanceOf(OrderAlreadyCompletedError);
    expect(served.status).toBe("served");
    expect(repo.save).not.toHaveBeenCalled();

    const alreadyReady = realOrder("ready");
    vi.mocked(repo.findById).mockResolvedValue(alreadyReady);
    const result = await svc.execute({
      orderId: 21,
      targetStatus: "ready",
      actor,
    });
    expect(result.previousStatus).toBe("ready");
    expect(result.newStatus).toBe("ready");
    expect(result.events).toEqual([]);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("persists pending → cancelled only", async () => {
    const { result } = await run("pending", "cancelled");
    expect(result.newStatus).toBe("cancelled");
    expect(result.events.some((e) => e.type === "OrderStatusChanged")).toBe(true);
  });

  it("rejects stale cancel after Accept and does not persist", async () => {
    const order = realOrder("preparing");
    vi.mocked(repo.findById).mockResolvedValue(order);
    await expect(
      svc.execute({ orderId: 21, targetStatus: "cancelled", actor })
    ).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(order.status).toBe("preparing");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("rejects direct cancel on ready and served without persist", async () => {
    const ready = realOrder("ready");
    vi.mocked(repo.findById).mockResolvedValue(ready);
    await expect(
      svc.execute({ orderId: 21, targetStatus: "cancelled", actor })
    ).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(ready.status).toBe("ready");

    const served = realOrder("served");
    vi.mocked(repo.findById).mockResolvedValue(served);
    await expect(
      svc.execute({ orderId: 21, targetStatus: "cancelled", actor })
    ).rejects.toBeInstanceOf(OrderAlreadyCompletedError);
    expect(served.status).toBe("served");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("rejects skip and backward transitions without persist", async () => {
    const pending = realOrder("pending");
    vi.mocked(repo.findById).mockResolvedValue(pending);
    await expect(
      svc.execute({ orderId: 21, targetStatus: "ready", actor })
    ).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(pending.status).toBe("pending");

    const preparing = realOrder("preparing");
    vi.mocked(repo.findById).mockResolvedValue(preparing);
    await expect(
      svc.execute({ orderId: 21, targetStatus: "pending", actor })
    ).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(preparing.status).toBe("preparing");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("second Accept is not a duplicate transition", async () => {
    const order = realOrder("preparing");
    vi.mocked(repo.findById).mockResolvedValue(order);
    const result = await svc.execute({
      orderId: 21,
      targetStatus: "preparing",
      actor,
    });
    expect(result.previousStatus).toBe("preparing");
    expect(result.newStatus).toBe("preparing");
    expect(result.events).toEqual([]);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("does not persist when save fails after a valid transition attempt", async () => {
    const order = realOrder("pending");
    vi.mocked(repo.findById).mockResolvedValue(order);
    vi.mocked(repo.save).mockRejectedValueOnce(new Error("persist failed"));
    await expect(
      svc.execute({ orderId: 21, targetStatus: "preparing", actor })
    ).rejects.toThrow("persist failed");
  });
});
