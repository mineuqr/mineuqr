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

    expect(statuses).toEqual(["preparing"]);
    expect(result.order.status).toBe("preparing");
    expect(result.events.map((event) => event.type)).toEqual([
      "OrderCreated",
      "OrderStatusChanged",
    ]);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        createRowStatus: "preparing",
        orderingChannel: "cashier_pos",
        skipBusinessIdentityAllocation: false,
      })
    );
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
    expect(result.events.map((event) => event.type)).toEqual(["OrderCreated"]);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orderingChannel: "kiosk",
      })
    );
    expect(vi.mocked(repo.save).mock.calls[0]?.[1]?.createRowStatus).toBeUndefined();
    expect(vi.mocked(repo.save).mock.calls[0]?.[1]?.skipBusinessIdentityAllocation).toBe(
      false
    );
  });

  it("fails closed when cashier_pos would persist a Dining Session", async () => {
    const repo: OrderRepository = {
      findById: vi.fn(),
      save: vi.fn(),
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
      { allocate: async () => "1010" },
      { issue: () => "track-pos-session" }
    );

    await expect(
      service.execute({
        restaurantId: 1,
        tableId: 0,
        tableNumber: 0,
        sessionId: 44,
        orderingChannel: "cashier_pos",
        items: [{ menuItemId: 1, quantity: 1 }],
      })
    ).rejects.toMatchObject({ code: "CASHIER_POS_SESSION_FORBIDDEN" });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("fails closed when cashier_pos would persist a real table", async () => {
    const repo: OrderRepository = {
      findById: vi.fn(),
      save: vi.fn(),
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
      { allocate: async () => "1011" },
      { issue: () => "track-pos-table" }
    );

    await expect(
      service.execute({
        restaurantId: 1,
        tableId: 7,
        tableNumber: 3,
        sessionId: null,
        orderingChannel: "cashier_pos",
        items: [{ menuItemId: 1, quantity: 1 }],
      })
    ).rejects.toMatchObject({ code: "CASHIER_POS_TABLE_FORBIDDEN" });
    expect(repo.save).not.toHaveBeenCalled();
  });
});
