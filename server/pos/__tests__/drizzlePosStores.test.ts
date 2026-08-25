/**
 * POS-PERSISTENCE-WIRING-1 — Drizzle store behavior with a mocked DB client.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DrizzlePosPermissionGrantStore } from "../infrastructure/DrizzlePosPermissionGrantStore";
import { DrizzlePosSaleIdempotencyStore } from "../infrastructure/DrizzlePosSaleIdempotencyStore";
import { DrizzlePosTerminalStore } from "../infrastructure/DrizzlePosTerminalStore";
import {
  POS_DATABASE_UNAVAILABLE,
  PosSaleIdempotencyConflictError,
  PosSaleIdempotencyUniqueCollisionError,
  PosTerminalCodeConflictError,
} from "../infrastructure/posPersistenceErrors";
import type { LoadPosDb } from "../infrastructure/posPersistenceErrors";
import type { PosSaleIdempotencyRecord } from "../infrastructure/PosSaleIdempotencyStore";
import type { PosTerminal } from "@shared/pos";

const NOW = "2026-08-16T16:00:00.000Z";
const MYSQL_NOW = "2026-08-16 16:00:00";

function terminalRow(overrides?: Record<string, unknown>) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    restaurantId: 1,
    code: "POS-001",
    lifecycle: "registered",
    replacedByTerminalId: null,
    optionalDeviceId: null,
    version: 1,
    createdAt: MYSQL_NOW,
    updatedAt: MYSQL_NOW,
    ...overrides,
  };
}

function grantRow(overrides?: Record<string, unknown>) {
  return {
    id: "grant-1",
    restaurantId: 1,
    userId: 7,
    permission: "SALE_CREATE",
    version: 1,
    createdAt: MYSQL_NOW,
    updatedAt: MYSQL_NOW,
    ...overrides,
  };
}

function saleRow(
  overrides?: Partial<PosSaleIdempotencyRecord> & { id?: string }
) {
  return {
    id: "idem-1",
    restaurantId: 1,
    terminalId: "11111111-1111-4111-8111-111111111111",
    userId: 7,
    idempotencyKey: "idem-key-01",
    fingerprint: "fp-aaaa",
    orderId: 101,
    orderNumber: "ORD-101",
    trackingToken: "tok-101",
    displayReference: "P #101",
    totalAmount: "12.50",
    itemCount: 1,
    checkId: 900,
    subtotal: "12.50",
    taxAmount: "0.00",
    grandTotal: "12.50",
    billDiscountAmount: "0.00",
    lines: [
      {
        description: "Item",
        quantity: 1,
        netAmount: "12.50",
        originOrderItemId: 1,
      },
    ],
    createdAt: MYSQL_NOW,
    ...overrides,
  };
}

function createMockDb(options: {
  rows?: unknown[] | (() => unknown[]);
  insert?: () => Promise<unknown>;
  updateResult?: { affectedRows: number };
  deleteResult?: { affectedRows: number };
}) {
  const rowsOf = () =>
    typeof options.rows === "function" ? options.rows() : options.rows ?? [];
  const limit = vi.fn(async () => rowsOf());
  const orderBy = vi.fn(async () => rowsOf());
  const whereSelect = vi.fn(() => ({
    limit,
    orderBy,
    then: (
      onFulfilled?: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(rowsOf()).then(onFulfilled, onRejected),
  }));
  const from = vi.fn(() => ({ where: whereSelect, orderBy }));
  const select = vi.fn(() => ({ from }));
  const values = vi.fn(async (payload: unknown) => {
    if (options.insert) return options.insert();
    return payload;
  });
  const insert = vi.fn(() => ({ values }));
  const whereUpdate = vi.fn(async () => options.updateResult ?? { affectedRows: 1 });
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));
  const whereDelete = vi.fn(async () => options.deleteResult ?? { affectedRows: 1 });
  const del = vi.fn(() => ({ where: whereDelete }));
  const db = { select, insert, update, delete: del };
  return {
    db,
    loadDb: (async () => db) as LoadPosDb,
    mocks: { values, insert, select, update, set, whereSelect, limit, orderBy, del, whereDelete },
  };
}

const terminal: PosTerminal = {
  id: "11111111-1111-4111-8111-111111111111",
  restaurantId: 1,
  code: "POS-001",
  lifecycle: "registered",
  replacedByTerminalId: null,
  optionalDeviceId: null,
  version: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("Drizzle POS Terminal store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed when the database is unavailable", async () => {
    const store = new DrizzlePosTerminalStore(async () => null);
    await expect(store.listByRestaurant(1)).rejects.toThrow(POS_DATABASE_UNAVAILABLE);
    await expect(store.getById("x")).rejects.toThrow(POS_DATABASE_UNAVAILABLE);
    await expect(store.insert(terminal)).rejects.toThrow(POS_DATABASE_UNAVAILABLE);
  });

  it("inserts, reads, lists, and updates lifecycle against pos_terminals", async () => {
    const { loadDb, mocks } = createMockDb({
      rows: [terminalRow()],
      updateResult: { affectedRows: 1 },
    });
    const store = new DrizzlePosTerminalStore(loadDb);
    await store.insert(terminal);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: terminal.id,
        restaurantId: 1,
        code: "POS-001",
        lifecycle: "registered",
      })
    );

    const found = await store.getById(terminal.id);
    expect(found?.code).toBe("POS-001");
    expect(found?.createdAt).toBe(NOW);

    const listed = await store.listByRestaurant(1);
    expect(listed).toHaveLength(1);
    expect(mocks.whereSelect).toHaveBeenCalled();

    const activated = await store.updateLifecycle(terminal.id, "active");
    expect(activated?.lifecycle).toBe("registered");
    expect(mocks.set).toHaveBeenCalled();
  });

  it("maps unique restaurant+code collisions to PosTerminalCodeConflictError", async () => {
    const { loadDb } = createMockDb({
      insert: async () => {
        const err = new Error("Duplicate");
        Object.assign(err, { code: "ER_DUP_ENTRY", errno: 1062 });
        throw err;
      },
    });
    const store = new DrizzlePosTerminalStore(loadDb);
    await expect(store.insert(terminal)).rejects.toBeInstanceOf(
      PosTerminalCodeConflictError
    );
  });
});

describe("Drizzle POS permission grant store", () => {
  it("fails closed when the database is unavailable", async () => {
    const store = new DrizzlePosPermissionGrantStore(async () => null);
    await expect(store.hasGrant(1, 7, "POS_ACCESS")).rejects.toThrow(
      POS_DATABASE_UNAVAILABLE
    );
  });

  it("lists restaurant/user grants and ignores unknown permission namespaces", async () => {
    const { loadDb } = createMockDb({
      rows: [grantRow(), grantRow({ permission: "NOT_A_POS_PERMISSION" })],
    });
    const store = new DrizzlePosPermissionGrantStore(loadDb);
    const listed = await store.listByRestaurantUser(1, 7);
    expect(listed).toEqual([
      { restaurantId: 1, userId: 7, permission: "SALE_CREATE" },
    ]);
  });

  it("inserts grants and returns the existing row on duplicate unique key", async () => {
    let inserted = false;
    const { loadDb, mocks } = createMockDb({
      rows: () => (inserted ? [grantRow()] : []),
      insert: async () => {
        if (!inserted) {
          inserted = true;
          const err = new Error("Duplicate");
          Object.assign(err, { code: "ER_DUP_ENTRY", errno: 1062 });
          throw err;
        }
      },
    });
    const store = new DrizzlePosPermissionGrantStore(loadDb);
    const grant = await store.upsert({
      restaurantId: 1,
      userId: 7,
      permission: "SALE_CREATE",
    });
    expect(grant).toEqual({
      restaurantId: 1,
      userId: 7,
      permission: "SALE_CREATE",
    });
    expect(mocks.insert).toHaveBeenCalled();
  });

  it("deletes a grant in restaurant/user/permission scope", async () => {
    const { loadDb, mocks } = createMockDb({
      deleteResult: { affectedRows: 1 },
    });
    const store = new DrizzlePosPermissionGrantStore(loadDb);
    expect(await store.remove(1, 7, "SALE_CREATE")).toBe(true);
    expect(mocks.del).toHaveBeenCalled();
  });
});

describe("Drizzle POS sale idempotency store", () => {
  it("fails closed when the database is unavailable", async () => {
    const store = new DrizzlePosSaleIdempotencyStore(async () => null);
    await expect(
      store.get({
        restaurantId: 1,
        terminalId: "t",
        userId: 7,
        idempotencyKey: "k",
      })
    ).rejects.toThrow(POS_DATABASE_UNAVAILABLE);
  });

  it("inserts and reads the unique restaurant/terminal/user/key record", async () => {
    const { loadDb, mocks } = createMockDb({ rows: [saleRow()] });
    const store = new DrizzlePosSaleIdempotencyStore(loadDb);
    await store.put(saleRow());
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        terminalId: "11111111-1111-4111-8111-111111111111",
        userId: 7,
        idempotencyKey: "idem-key-01",
        fingerprint: "fp-aaaa",
        orderId: 101,
      })
    );
    const found = await store.get({
      restaurantId: 1,
      terminalId: "11111111-1111-4111-8111-111111111111",
      userId: 7,
      idempotencyKey: "idem-key-01",
    });
    expect(found?.orderId).toBe(101);
    expect(found?.createdAt).toBe(NOW);
  });

  it("treats duplicate key + same fingerprint as success without overwrite", async () => {
    const { loadDb, mocks } = createMockDb({
      rows: [saleRow()],
      insert: async () => {
        const err = new Error("Duplicate");
        Object.assign(err, { code: "ER_DUP_ENTRY", errno: 1062 });
        throw err;
      },
    });
    const store = new DrizzlePosSaleIdempotencyStore(loadDb);
    await expect(store.put({ ...saleRow(), orderId: 999 })).resolves.toBeUndefined();
    expect(mocks.values).toHaveBeenCalled();
  });

  it("fails closed on duplicate key + different fingerprint and does not overwrite", async () => {
    const { loadDb } = createMockDb({
      rows: [saleRow()],
      insert: async () => {
        const err = new Error("Duplicate");
        Object.assign(err, { code: "ER_DUP_ENTRY", errno: 1062 });
        throw err;
      },
    });
    const store = new DrizzlePosSaleIdempotencyStore(loadDb);
    await expect(
      store.put({ ...saleRow(), fingerprint: "fp-bbbb", orderId: 202 })
    ).rejects.toBeInstanceOf(PosSaleIdempotencyConflictError);
  });

  it("putInTransaction fails unique collisions so the companion Order tx can roll back", async () => {
    const tx = {
      insert: () => ({
        values: async () => {
          const err = new Error("Duplicate");
          Object.assign(err, { code: "ER_DUP_ENTRY", errno: 1062 });
          throw err;
        },
      }),
    };
    const store = new DrizzlePosSaleIdempotencyStore(async () => null);
    await expect(store.putInTransaction(tx, saleRow())).rejects.toBeInstanceOf(
      PosSaleIdempotencyUniqueCollisionError
    );
  });
});
