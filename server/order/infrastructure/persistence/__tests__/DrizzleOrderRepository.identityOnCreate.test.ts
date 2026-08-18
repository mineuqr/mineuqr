/**
 * BUSINESS-IDENTITY-LATENCY-REMEDIATION-1
 * Identity is allocated before Order INSERT and stamped on the INSERT.
 * The hot path must not issue a post-insert identity UPDATE.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Order } from "../../../domain/aggregate/Order";
import { resolveOrderActorFromSystem } from "../../../application/resolveOrderActor";
import { DrizzleOrderRepository } from "../DrizzleOrderRepository";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  requireRestaurantRowForOrderPersist: vi.fn(),
}));

vi.mock("../../../../db", () => ({
  getDb: mocks.getDb,
}));

vi.mock("../../../../db/restaurantRowLock", () => ({
  requireRestaurantRowForOrderPersist: mocks.requireRestaurantRowForOrderPersist,
}));

const WORKING_HOURS = { monday: { open: "09:00", close: "23:00" } };
const IDENTITY = {
  businessDay: "2026-08-18",
  dailyDisplayNumber: 12,
  identityScope: "POS" as const,
};

function placeOrder() {
  return Order.placeNew({
    restaurantId: 41,
    tableId: 0,
    tableNumber: 0,
    sessionId: null,
    serviceMode: "counter",
    fulfilmentAnchorType: "station",
    fulfilmentLabel: "Cashier",
    customerName: null,
    customerPhone: null,
    notes: null,
    totalAmount: "5.00",
    orderNumber: "1001",
    trackingToken: "tok-1",
    createdAt: "2026-08-18T10:00:00.000Z",
    lines: [
      {
        menuItemId: 1,
        nameAr: "شاي",
        nameEn: "Tea",
        unitPrice: "5.00",
        quantity: 1,
        notes: null,
      },
    ],
  });
}

describe("DrizzleOrderRepository identity-on-create", () => {
  const sequence: string[] = [];
  const appendInTransaction = vi.fn(async () => {
    sequence.push("outbox");
  });
  const allocateForNewOrder = vi.fn(async () => {
    sequence.push("allocate");
    return IDENTITY;
  });

  let orderInsertValues: Record<string, unknown> | undefined;
  let acceptUpdateSet: Record<string, unknown> | undefined;
  let insertOrdersShouldFail = false;

  beforeEach(() => {
    sequence.length = 0;
    orderInsertValues = undefined;
    acceptUpdateSet = undefined;
    insertOrdersShouldFail = false;
    appendInTransaction.mockClear();
    allocateForNewOrder.mockClear();
    mocks.requireRestaurantRowForOrderPersist.mockImplementation(async () => {
      sequence.push("lock");
      return { id: 41, userId: 9, workingHours: WORKING_HOURS };
    });

    const tx = {
      insert: vi.fn((_table: unknown) => ({
        values: vi.fn(async (values: unknown) => {
          if (Array.isArray(values)) {
            sequence.push("insert-lines");
            return;
          }
          sequence.push("insert-orders");
          orderInsertValues = values as Record<string, unknown>;
          if (insertOrdersShouldFail) {
            throw new Error("order_insert_failed");
          }
          return [{ insertId: 501 }];
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn((values: Record<string, unknown>) => {
          acceptUpdateSet = values;
          return {
            where: vi.fn(async () => {
              sequence.push("accept-update");
            }),
          };
        }),
      })),
    };

    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
    });
  });

  function repository() {
    return new DrizzleOrderRepository(
      { appendInTransaction } as never,
      { allocateForNewOrder } as never
    );
  }

  it("allocates identity from the locked workingHours then INSERTs those fields", async () => {
    const result = await repository().save(placeOrder(), {
      identityScope: "POS",
    });

    expect(mocks.requireRestaurantRowForOrderPersist).toHaveBeenCalled();
    expect(allocateForNewOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        restaurantId: 41,
        workingHours: WORKING_HOURS,
        identityScope: "POS",
      })
    );
    expect(sequence.slice(0, 4)).toEqual([
      "lock",
      "allocate",
      "insert-orders",
      "insert-lines",
    ]);
    expect(orderInsertValues).toMatchObject({
      restaurantId: 41,
      businessDay: "2026-08-18",
      dailyDisplayNumber: 12,
      identityScope: "POS",
    });
    expect(result.businessIdentity).toEqual(IDENTITY);
    expect(appendInTransaction).toHaveBeenCalledTimes(1);
  });

  it("does not issue an identity UPDATE on the new-order hot path", async () => {
    await repository().save(placeOrder(), { identityScope: "POS" });
    expect(acceptUpdateSet).toBeUndefined();
    expect(sequence).not.toContain("accept-update");
  });

  it("Accept UPDATE remains status/lifecycle only after identity-on-create INSERT", async () => {
    await repository().save(placeOrder(), {
      identityScope: "POS",
      onPersisted: (persisted) => {
        persisted.advanceStatus(
          "preparing",
          resolveOrderActorFromSystem("cashier-pos-inbound-accept", {
            displayName: "Cashier POS",
            restaurantId: 41,
          }),
          persisted.createdAt
        );
        return persisted.pullDomainEvents();
      },
    });

    expect(orderInsertValues).toMatchObject({
      businessDay: "2026-08-18",
      dailyDisplayNumber: 12,
      identityScope: "POS",
    });
    expect(acceptUpdateSet).toEqual({
      status: "preparing",
      lifecycleStage: "active",
    });
    expect(acceptUpdateSet).not.toHaveProperty("businessDay");
    expect(acceptUpdateSet).not.toHaveProperty("dailyDisplayNumber");
    expect(acceptUpdateSet).not.toHaveProperty("identityScope");
    expect(sequence).toEqual([
      "lock",
      "allocate",
      "insert-orders",
      "insert-lines",
      "accept-update",
      "outbox",
    ]);
  });

  it("skips Accept UPDATE when createRowStatus already matches inbound preparing", async () => {
    await repository().save(placeOrder(), {
      identityScope: "POS",
      createRowStatus: "preparing",
      onPersisted: (persisted) => {
        persisted.advanceStatus(
          "preparing",
          resolveOrderActorFromSystem("cashier-pos-inbound-accept", {
            displayName: "Cashier POS",
            restaurantId: 41,
          }),
          persisted.createdAt
        );
        return persisted.pullDomainEvents();
      },
    });

    expect(orderInsertValues).toMatchObject({
      status: "preparing",
      businessDay: "2026-08-18",
      dailyDisplayNumber: 12,
    });
    expect(acceptUpdateSet).toBeUndefined();
    expect(sequence).toEqual([
      "lock",
      "allocate",
      "insert-orders",
      "insert-lines",
      "outbox",
    ]);
  });

  it("rolls back the persist callback when Order INSERT fails after sequence allocation", async () => {
    insertOrdersShouldFail = true;
    await expect(
      repository().save(placeOrder(), {
        identityScope: "POS",
        afterPersistInTransaction: async () => {
          sequence.push("idempotency-put");
        },
      })
    ).rejects.toThrow("order_insert_failed");

    expect(sequence).toEqual(["lock", "allocate", "insert-orders"]);
    expect(appendInTransaction).not.toHaveBeenCalled();
  });
});
