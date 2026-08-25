/**
 * CASHIER-REBUILD-1 — pos.sale.create writes Order only. No OPEN Check.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosSaleIdempotencyStore } from "../infrastructure/InMemoryPosSaleIdempotencyStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { POS_SALE_IDEMPOTENCY_UNASSIGNED_CHECK_ID } from "../infrastructure/PosSaleIdempotencyStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosSaleService } from "../services/PosSaleService";
import type { IdentityPlaceOrderService } from "../../order/application/IdentityPlaceOrderService";
import type { SelectUser } from "../../../drizzle/schema";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
}));
vi.mock("../../subscription-runtime", () => ({
  checkLimit: vi.fn(),
}));
vi.mock("../../platform-owner-access/identity", () => ({
  isPlatformOwner: vi.fn(() => false),
}));
vi.mock("../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));
vi.mock("../../order/application/mapOrderDomainError", () => ({
  runOrderCommand: async <T>(fn: () => Promise<T>) => fn(),
}));

import { getRestaurantById } from "../../db";
import { checkLimit } from "../../subscription-runtime";

const RESTAURANT_A = 1;
const OWNER_A = 10;
const STAFF_A = 7;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";

function user(id: number): SelectUser {
  return { id, role: "user" } as SelectUser;
}

function mockLimit() {
  vi.mocked(checkLimit).mockResolvedValue({
    allowed: true,
    reasonCode: "unlimited",
    limitKey: "posTerminals",
    cap: null,
    proposedTotal: 1,
    policy: "unlimited",
    source: "test",
  });
}

function fakePlaceOrder() {
  let seq = 100;
  const execute = vi.fn(
    async (
      command: { items: readonly { quantity: number }[] },
      persist?: {
        afterPersistInTransaction?: (
          tx: unknown,
          result: {
            order: {
              id: number;
              orderNumber: string;
              trackingToken: string;
              totalAmount: string;
              createdAt: string;
              fulfilmentAnchorType: string;
              serviceMode: string;
              lines: Array<{ quantity: number }>;
            };
            outboxEventIds: string[];
            businessIdentity?: {
              businessDay: string;
              dailyDisplayNumber: number;
              identityScope: string;
            };
          }
        ) => Promise<void>;
      }
    ) => {
      seq += 1;
      const order = {
        id: seq,
        orderNumber: `ORD-${seq}`,
        trackingToken: `tok-${seq}`,
        totalAmount: "12.50",
        createdAt: "2026-08-16T01:00:00.000Z",
        fulfilmentAnchorType: "station",
        serviceMode: "counter",
        lines: command.items.map((item) => ({ quantity: item.quantity })),
      };
      const tx = { kind: "order-tx" };
      if (persist?.afterPersistInTransaction) {
        await persist.afterPersistInTransaction(tx, {
          order,
          outboxEventIds: [],
          businessIdentity: {
            businessDay: "2026-08-16",
            dailyDisplayNumber: seq,
            identityScope: "POS",
          },
        });
      }
      return {
        order,
        events: [],
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        displayReference: `P #${String(seq).padStart(3, "0")}`,
        totalAmount: order.totalAmount,
        itemCount: command.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
        identity: {},
        sessionPersistence: "ephemeral" as const,
      };
    }
  );
  return { execute } as unknown as IdentityPlaceOrderService & {
    execute: ReturnType<typeof vi.fn>;
  };
}

describe("CASHIER-REBUILD-1 — sale create without OPEN Check", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantById).mockResolvedValue({
      id: RESTAURANT_A,
      userId: OWNER_A,
    } as never);
    mockLimit();
  });

  async function ready() {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    const idempotency = new InMemoryPosSaleIdempotencyStore();
    const access = new PosAccessService(
      store,
      grants,
      new PosEntitlementService(store)
    );
    await store.insert({
      id: TERMINAL_A,
      restaurantId: RESTAURANT_A,
      code: "POS-001",
      lifecycle: "active",
      replacedByTerminalId: null,
      optionalDeviceId: null,
      version: 1,
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:00.000Z",
    });
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "POS_ACCESS",
    });
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "SALE_CREATE",
    });
    const place = fakePlaceOrder();
    const sale = new PosSaleService(grants, access, place, idempotency);
    return { sale, place, idempotency };
  }

  const command = {
    restaurantId: RESTAURANT_A,
    terminalId: TERMINAL_A,
    items: [{ menuItemId: 41, quantity: 2 }],
    idempotencyKey: "sale-open-check-01",
  };

  it("creates an Order invoice and does not enroll a Check", async () => {
    const { sale, place } = await ready();
    const result = await sale.create({ user: user(STAFF_A), command });
    expect(result.orderId).toBeGreaterThan(0);
    expect(result).not.toHaveProperty("checkId");
    expect(result).not.toHaveProperty("outcome");
    expect(result.money).toEqual({
      subtotal: "12.50",
      taxAmount: "0.00",
      grandTotal: "12.50",
      billDiscountAmount: "0.00",
    });
    expect(result.lines[0]?.quantity).toBe(2);
    expect(place.execute.mock.calls[0][1]).toMatchObject({
      enrollCheck: false,
      afterPersistInTransaction: expect.any(Function),
    });
  });

  it("writes sale idempotency on the Order transaction without a Check id", async () => {
    const { sale, idempotency } = await ready();
    const result = await sale.create({ user: user(STAFF_A), command });
    const stored = await idempotency.get({
      restaurantId: RESTAURANT_A,
      terminalId: TERMINAL_A,
      userId: STAFF_A,
      idempotencyKey: command.idempotencyKey,
    });
    expect(stored?.orderId).toBe(result.orderId);
    expect(stored?.checkId).toBe(POS_SALE_IDEMPOTENCY_UNASSIGNED_CHECK_ID);
  });

  it("replays the same orderId for the same sale key", async () => {
    const { sale, place } = await ready();
    const first = await sale.create({ user: user(STAFF_A), command });
    const second = await sale.create({ user: user(STAFF_A), command });
    expect(second.replayed).toBe(true);
    expect(second.orderId).toBe(first.orderId);
    expect(place.execute).toHaveBeenCalledTimes(1);
  });
});
