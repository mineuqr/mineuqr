/**
 * ORDER-SUBMISSION-LATENCY-INSTRUMENTATION-1
 * PlaceOrder records pricing_ms / number_ms when ALS is active.
 */
import { describe, expect, it, vi } from "vitest";
import { PlaceOrderService } from "../PlaceOrderService";
import { Order } from "../../domain/aggregate/Order";
import type { OrderRepository } from "../../repositories/OrderRepository";
import { withOrderLifecycleLatency } from "../../observability/orderLifecycleLatency";
import {
  getOrderLifecycleLatencyAggregate,
  resetOrderLifecycleLatencyAggregateForTests,
} from "@shared/order-lifecycle-latency";

const STAGE_MS = 25;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("ORDER-SUBMISSION-LATENCY-INSTRUMENTATION-1 — PlaceOrder phases", () => {
  it("records pricing_ms and number_ms inside an active lifecycle trace", async () => {
    const repo: OrderRepository = {
      findById: vi.fn(),
      save: vi.fn(async (order) => {
        const persisted = Order.reconstitute({
          ...order.snapshotForCreate(),
          id: 91,
          status: "pending",
          lifecycleStage: "active",
          readyAt: null,
          createdAt: order.createdAt,
          updatedAt: order.createdAt,
        });
        return { order: persisted, outboxEventIds: [] };
      }),
    };

    const service = new PlaceOrderService(
      repo,
      {
        resolveLines: async () => {
          await wait(STAGE_MS);
          return {
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
          };
        },
      },
      {
        allocate: async () => {
          await wait(STAGE_MS);
          return "ORD-0091";
        },
      },
      { issue: () => "track-submit-lat" }
    );

    resetOrderLifecycleLatencyAggregateForTests();
    await withOrderLifecycleLatency(
      {
        traceId: "olt_order_create_phase",
        restaurantId: 1,
        transition: "place",
        surface: "order.create",
      },
      () =>
        service.execute({
          restaurantId: 1,
          tableId: 3,
          tableNumber: 3,
          sessionId: null,
          orderingChannel: "qr",
          items: [{ menuItemId: 1, quantity: 1 }],
        })
    );

    const agg = getOrderLifecycleLatencyAggregate();
    expect(agg.count).toBe(1);
    expect(agg.phaseAvgs.pricing_ms).toBeGreaterThanOrEqual(STAGE_MS - 5);
    expect(agg.phaseAvgs.number_ms).toBeGreaterThanOrEqual(STAGE_MS - 5);
  });

  it("overlaps pricing and number allocation on the same wall-clock wave", async () => {
    const overlapMs = 40;
    const repo: OrderRepository = {
      findById: vi.fn(),
      save: vi.fn(async (order) => {
        const persisted = Order.reconstitute({
          ...order.snapshotForCreate(),
          id: 93,
          status: "pending",
          lifecycleStage: "active",
          readyAt: null,
          createdAt: order.createdAt,
          updatedAt: order.createdAt,
        });
        return { order: persisted, outboxEventIds: [] };
      }),
    };

    const service = new PlaceOrderService(
      repo,
      {
        resolveLines: async () => {
          await wait(overlapMs);
          return {
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
          };
        },
      },
      {
        allocate: async () => {
          await wait(overlapMs);
          return "ORD-0093";
        },
      },
      { issue: () => "track-submit-overlap" }
    );

    const started = Date.now();
    await service.execute({
      restaurantId: 1,
      tableId: 3,
      tableNumber: 3,
      sessionId: null,
      orderingChannel: "qr",
      items: [{ menuItemId: 1, quantity: 1 }],
    });
    const elapsedMs = Date.now() - started;
    expect(elapsedMs).toBeLessThan(overlapMs * 2 - 10);
  });

  it("does not record phases when no lifecycle context is active", async () => {
    const service = new PlaceOrderService(
      {
        findById: vi.fn(),
        save: vi.fn(async (order) => {
          const persisted = Order.reconstitute({
            ...order.snapshotForCreate(),
            id: 92,
            status: "pending",
            lifecycleStage: "active",
            readyAt: null,
            createdAt: order.createdAt,
            updatedAt: order.createdAt,
          });
          return { order: persisted, outboxEventIds: [] };
        }),
      },
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
      { allocate: async () => "ORD-0092" },
      { issue: () => "track-submit-lat-2" }
    );

    resetOrderLifecycleLatencyAggregateForTests();
    await service.execute({
      restaurantId: 1,
      tableId: 3,
      tableNumber: 3,
      sessionId: null,
      orderingChannel: "qr",
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(getOrderLifecycleLatencyAggregate().count).toBe(0);
  });
});
