/**
 * POS-SALE-TRANSACTIONAL-SAFETY-HARDENING-1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosSaleIdempotencyStore } from "../infrastructure/InMemoryPosSaleIdempotencyStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosSaleService } from "../services/PosSaleService";
import type { IdentityPlaceOrderService } from "../../order/application/IdentityPlaceOrderService";
import type { SaveOrderResult } from "../../order/repositories/OrderRepository";
import { stubCheckSnapshots, stubOpenCheckEnrollment } from "./cashierOpenCheckTestDouble";

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
const STAFF_A = 7;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";

function user(id: number): SelectUser {
  return { id, role: "user" } as SelectUser;
}

class UnsynchronizedIdempotencyStore extends InMemoryPosSaleIdempotencyStore {
  async runExclusive<T>(_input: never, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

function saveOrderFromSeq(
  seq: number,
  items: readonly { quantity: number }[]
): SaveOrderResult {
  return {
    order: {
      id: seq,
      orderNumber: `ORD-${seq}`,
      trackingToken: `tok-${seq}`,
      totalAmount: "12.50",
      createdAt: "2026-08-16T01:00:00.000Z",
      fulfilmentAnchorType: "station",
      serviceMode: "counter",
      lines: items.map((item) => ({ quantity: item.quantity })),
    } as SaveOrderResult["order"],
    outboxEventIds: [],
    businessIdentity: {
      businessDay: "2026-08-16",
      dailyDisplayNumber: seq,
      identityScope: "POS",
    },
  };
}

function transactionalPlaceOrder() {
  const committed: number[] = [];
  let seq = 100;
  const execute = vi.fn(
    async (
      command: { items: readonly { quantity: number }[] },
      persist?: {
        afterPersistInTransaction?: (
          tx: unknown,
          result: SaveOrderResult
        ) => Promise<void>;
      }
    ) => {
      seq += 1;
      const result = saveOrderFromSeq(seq, command.items);
      try {
        if (persist?.afterPersistInTransaction) {
          await persist.afterPersistInTransaction({ kind: "tx" }, result);
        }
        committed.push(result.order.id!);
      } catch (error) {
        throw error;
      }
      return {
        order: result.order,
        events: [],
        orderNumber: result.order.orderNumber,
        trackingToken: result.order.trackingToken,
        displayReference: `P #${String(seq).padStart(3, "0")}`,
        totalAmount: result.order.totalAmount,
        itemCount: command.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: result.order.createdAt,
        identity: {},
        sessionPersistence: "ephemeral" as const,
      };
    }
  );
  return {
    committed,
    place: { execute } as unknown as IdentityPlaceOrderService,
  };
}

function failingOrderPlace() {
  return {
    execute: vi.fn(async () => {
      throw new Error("order_write_failed");
    }),
  } as unknown as IdentityPlaceOrderService;
}

describe("POS sale transactional safety", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantById).mockResolvedValue({
      id: RESTAURANT_A,
      userId: 10,
    } as never);
    vi.mocked(checkLimit).mockResolvedValue({
      allowed: true,
      reasonCode: "unlimited",
      limitKey: "posTerminals",
      cap: null,
      proposedTotal: 1,
      policy: "unlimited",
      source: "test",
    } as never);
  });

  async function readySale(
    place: IdentityPlaceOrderService,
    idempotency = new InMemoryPosSaleIdempotencyStore()
  ) {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
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
    const access = new PosAccessService(
      store,
      grants,
      new PosEntitlementService(store)
    );
    const sale = new PosSaleService(
      grants,
      access,
      place,
      idempotency,
      undefined,
      async () => stubCheckSnapshots(),
      async () => stubOpenCheckEnrollment()
    );
    return { sale, idempotency };
  }

  const command = {
    restaurantId: RESTAURANT_A,
    terminalId: TERMINAL_A,
    items: [{ menuItemId: 1, quantity: 1 }],
    idempotencyKey: "idem-key-01",
  };

  it("commits Order and mapping together on success", async () => {
    const { place, committed } = transactionalPlaceOrder();
    const { sale, idempotency } = await readySale(place);
    const result = await sale.create({ user: user(STAFF_A), command });
    expect(result.replayed).toBe(false);
    expect(committed).toEqual([result.orderId]);
    expect(result.checkId).toBe(900);
    expect(result.outcome).toBe("open");
    expect(await idempotency.get({
      restaurantId: RESTAURANT_A,
      terminalId: TERMINAL_A,
      userId: STAFF_A,
      idempotencyKey: "idem-key-01",
    })).toMatchObject({ orderId: result.orderId, fingerprint: expect.any(String) });
  });

  it("replays the same key and fingerprint without a second Order", async () => {
    const { place, committed } = transactionalPlaceOrder();
    const { sale } = await readySale(place);
    const first = await sale.create({ user: user(STAFF_A), command });
    const second = await sale.create({ user: user(STAFF_A), command });
    expect(second.replayed).toBe(true);
    expect(second.orderId).toBe(first.orderId);
    expect(second.checkId).toBe(first.checkId);
    expect(committed).toEqual([first.orderId]);
  });

  it("fails closed on same key and different fingerprint", async () => {
    const { place, committed } = transactionalPlaceOrder();
    const { sale } = await readySale(place);
    await sale.create({ user: user(STAFF_A), command });
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          ...command,
          items: [{ menuItemId: 2, quantity: 1 }],
        },
      })
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
    expect(committed).toHaveLength(1);
  });

  it("rolls back the companion Order when mapping unique-collides (cross-instance race)", async () => {
    const { place, committed } = transactionalPlaceOrder();
    const idempotency = new UnsynchronizedIdempotencyStore();
    const { sale } = await readySale(place, idempotency);
    const [first, second] = await Promise.all([
      sale.create({ user: user(STAFF_A), command }),
      sale.create({ user: user(STAFF_A), command }),
    ]);
    const winner = first.replayed ? second : first;
    const loser = first.replayed ? first : second;
    expect(winner.replayed).toBe(false);
    expect(loser.replayed).toBe(true);
    expect(loser.orderId).toBe(winner.orderId);
    expect(committed).toEqual([winner.orderId]);
    expect(place.execute).toHaveBeenCalledTimes(2);
  });

  it("keeps different idempotency keys independent", async () => {
    const { place, committed } = transactionalPlaceOrder();
    const { sale } = await readySale(place);
    const a = await sale.create({ user: user(STAFF_A), command });
    const b = await sale.create({
      user: user(STAFF_A),
      command: { ...command, idempotencyKey: "idem-key-02" },
    });
    expect(a.orderId).not.toBe(b.orderId);
    expect(committed).toEqual([a.orderId, b.orderId]);
  });

  it("does not persist a mapping when Order persistence fails", async () => {
    const { sale, idempotency } = await readySale(failingOrderPlace());
    await expect(
      sale.create({ user: user(STAFF_A), command })
    ).rejects.toThrow("order_write_failed");
    expect(
      await idempotency.get({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        userId: STAFF_A,
        idempotencyKey: "idem-key-01",
      })
    ).toBeNull();
  });

  it("rolls back the companion Order when OPEN Check enrollment fails", async () => {
    const { place, committed } = transactionalPlaceOrder();
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
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
    const access = new PosAccessService(
      store,
      grants,
      new PosEntitlementService(store)
    );
    const idempotency = new InMemoryPosSaleIdempotencyStore();
    const sale = new PosSaleService(
      grants,
      access,
      place,
      idempotency,
      undefined,
      async () => stubCheckSnapshots(),
      async () => {
        throw new Error("check_write_failed");
      }
    );
    await expect(
      sale.create({ user: user(STAFF_A), command })
    ).rejects.toThrow("check_write_failed");
    expect(committed).toEqual([]);
    expect(
      await idempotency.get({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        userId: STAFF_A,
        idempotencyKey: "idem-key-01",
      })
    ).toBeNull();
  });

  it("does not keep a committed Order when mapping persistence fails", async () => {
    const { place, committed } = transactionalPlaceOrder();
    const idempotency = new InMemoryPosSaleIdempotencyStore();
    idempotency.putInTransaction = async () => {
      throw new Error("idempotency_write_failed");
    };
    const { sale } = await readySale(place, idempotency);
    await expect(
      sale.create({ user: user(STAFF_A), command })
    ).rejects.toThrow("idempotency_write_failed");
    expect(committed).toEqual([]);
  });

  it("maps unique collision after rollback to fingerprint mismatch fail-closed", async () => {
    const { place, committed } = transactionalPlaceOrder();
    const idempotency = new UnsynchronizedIdempotencyStore();
    const { sale } = await readySale(place, idempotency);
    const results = await Promise.allSettled([
      sale.create({ user: user(STAFF_A), command }),
      sale.create({
        user: user(STAFF_A),
        command: {
          ...command,
          items: [{ menuItemId: 9, quantity: 2 }],
        },
      }),
    ]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(committed).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({ code: "idempotency_conflict" }),
    });
  });

  it("attributes cashier and channel from server context", async () => {
    const { place } = transactionalPlaceOrder();
    const { sale } = await readySale(place);
    const result = await sale.create({ user: user(STAFF_A), command });
    expect(result.cashierUserId).toBe(STAFF_A);
    expect(result.terminalId).toBe(TERMINAL_A);
    expect(result.orderingChannel).toBe("cashier_pos");
  });
});
