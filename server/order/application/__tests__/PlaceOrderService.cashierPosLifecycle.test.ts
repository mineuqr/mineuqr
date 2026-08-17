import { describe, expect, it, vi } from "vitest";
import { PlaceOrderService } from "../PlaceOrderService";
import { Order } from "../../domain/aggregate/Order";
import type { OrderRepository } from "../../repositories/OrderRepository";

describe("PlaceOrderService cashier_pos inbound acceptance", () => {
  it("advances cashier_pos from pending to preparing after persist", async () => {
    const statuses: string[] = [];
    const repo: OrderRepository = {
      findById: vi.fn(),
      save: vi.fn(async (order, options) => {
        if (order.isNew()) {
          const persisted = Order.reconstitute({
            ...order.snapshotForCreate(),
            id: 44,
            status: "pending",
            lifecycleStage: "active",
            readyAt: null,
            createdAt: order.createdAt,
            updatedAt: order.createdAt,
          });
          options?.onPersisted?.(persisted);
          statuses.push(persisted.status);
          return { order: persisted, outboxEventIds: [], businessIdentity: {
            businessDay: "2026-08-17",
            dailyDisplayNumber: 8,
            identityScope: "POS",
          } };
        }
        statuses.push(order.status);
        return { order, outboxEventIds: [] };
      }),
    };

    const service = new PlaceOrderService(
      repo,
      {
        resolveLines: async () => ({
          lines: [
            {
              menuItemId: 1,
              nameAr: "شاي",
              nameEn: "Tea",
              price: "5.00",
              quantity: 1,
              notes: null,
              modifiers: null,
            },
          ],
          totalAmount: "5.00",
        }),
      },
      { allocate: async () => "1008" },
      { issue: () => "track-pos" }
    );

    const result = await service.execute({
      restaurantId: 1,
      tableId: 0,
      tableNumber: 0,
      sessionId: null,
      orderingChannel: "cashier_pos",
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(statuses).toEqual(["pending", "preparing"]);
    expect(result.order.status).toBe("preparing");
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it("does not auto-accept kiosk orders", async () => {
    const repo: OrderRepository = {
      findById: vi.fn(),
      save: vi.fn(async (order, options) => {
        const persisted = Order.reconstitute({
          ...order.snapshotForCreate(),
          id: 45,
          status: "pending",
          lifecycleStage: "active",
          readyAt: null,
          createdAt: order.createdAt,
          updatedAt: order.createdAt,
        });
        options?.onPersisted?.(persisted);
        return { order: persisted, outboxEventIds: [] };
      }),
    };
    const service = new PlaceOrderService(
      repo,
      {
        resolveLines: async () => ({
          lines: [
            {
              menuItemId: 1,
              nameAr: "شاي",
              nameEn: "Tea",
              price: "5.00",
              quantity: 1,
              notes: null,
              modifiers: null,
            },
          ],
          totalAmount: "5.00",
        }),
      },
      { allocate: async () => "1009" },
      { issue: () => "track-kiosk" }
    );

    const result = await service.execute({
      restaurantId: 1,
      tableId: 0,
      tableNumber: 0,
      sessionId: null,
      orderingChannel: "kiosk",
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(result.order.status).toBe("pending");
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
