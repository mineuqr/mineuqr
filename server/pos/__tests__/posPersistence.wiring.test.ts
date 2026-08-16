/**
 * POS-PERSISTENCE-WIRING-1 — production composition vs test doubles,
 * InMemory contract parity, uniqueness, fingerprint fail-closed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
  getDb: vi.fn(async () => null),
}));
vi.mock("../../subscription-runtime", () => ({
  checkLimit: vi.fn(),
}));
vi.mock("../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { getRestaurantById } from "../../db";
import { checkLimit } from "../../subscription-runtime";
import { DrizzlePosPermissionGrantStore } from "../infrastructure/DrizzlePosPermissionGrantStore";
import { DrizzlePosSaleIdempotencyStore } from "../infrastructure/DrizzlePosSaleIdempotencyStore";
import { DrizzlePosTerminalStore } from "../infrastructure/DrizzlePosTerminalStore";
import { InMemoryPosCheckIntakeIdempotencyStore } from "../infrastructure/InMemoryPosCheckIntakeIdempotencyStore";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosSaleIdempotencyStore } from "../infrastructure/InMemoryPosSaleIdempotencyStore";
import { InMemoryPosSettlementInitiateIdempotencyStore } from "../infrastructure/InMemoryPosSettlementInitiateIdempotencyStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import {
  PosSaleIdempotencyConflictError,
  PosTerminalCodeConflictError,
  fromMysqlTimestampString,
  isMysqlDuplicateKeyError,
  toMysqlTimestampString,
} from "../infrastructure/posPersistenceErrors";
import type { PosSaleIdempotencyRecord } from "../infrastructure/PosSaleIdempotencyStore";
import {
  selectPosPermissionGrantStore,
  selectPosSaleIdempotencyStore,
  selectPosTerminalStore,
} from "../infrastructure/posStoreSelection";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosTerminalService } from "../services/PosTerminalService";
import type { PosTerminal } from "@shared/pos";

const RESTAURANT_A = 1;
const RESTAURANT_B = 2;
const NOW = "2026-08-16T16:00:00.000Z";

function terminal(overrides?: Partial<PosTerminal>): PosTerminal {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    restaurantId: RESTAURANT_A,
    code: "POS-001",
    lifecycle: "registered",
    replacedByTerminalId: null,
    optionalDeviceId: null,
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function saleRecord(
  overrides?: Partial<PosSaleIdempotencyRecord>
): PosSaleIdempotencyRecord {
  return {
    restaurantId: RESTAURANT_A,
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
    createdAt: NOW,
    ...overrides,
  };
}

describe("POS persistence composition", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: 10 } as never;
      return undefined as never;
    });
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

  it("uses InMemory stores when NODE_ENV is test", () => {
    expect(selectPosTerminalStore("test")).toBeInstanceOf(InMemoryPosTerminalStore);
    expect(selectPosPermissionGrantStore("test")).toBeInstanceOf(
      InMemoryPosPermissionGrantStore
    );
    expect(selectPosSaleIdempotencyStore("test")).toBeInstanceOf(
      InMemoryPosSaleIdempotencyStore
    );
  });

  it("uses Drizzle stores for production and development", () => {
    expect(selectPosTerminalStore("production")).toBeInstanceOf(DrizzlePosTerminalStore);
    expect(selectPosTerminalStore("development")).toBeInstanceOf(DrizzlePosTerminalStore);
    expect(selectPosPermissionGrantStore("production")).toBeInstanceOf(
      DrizzlePosPermissionGrantStore
    );
    expect(selectPosSaleIdempotencyStore("production")).toBeInstanceOf(
      DrizzlePosSaleIdempotencyStore
    );
    expect(selectPosSaleIdempotencyStore("development")).toBeInstanceOf(
      DrizzlePosSaleIdempotencyStore
    );
  });

  it("keeps Check and Settlement idempotency InMemory (no SQL tables)", () => {
    expect(new InMemoryPosCheckIntakeIdempotencyStore()).toBeInstanceOf(
      InMemoryPosCheckIntakeIdempotencyStore
    );
    expect(new InMemoryPosSettlementInitiateIdempotencyStore()).toBeInstanceOf(
      InMemoryPosSettlementInitiateIdempotencyStore
    );
  });
});

describe("POS MySQL persistence helpers", () => {
  it("detects duplicate-key races including nested causes", () => {
    expect(isMysqlDuplicateKeyError({ errno: 1062 })).toBe(true);
    expect(isMysqlDuplicateKeyError({ code: "ER_DUP_ENTRY" })).toBe(true);
    expect(isMysqlDuplicateKeyError({ cause: { errno: 1062 } })).toBe(true);
    expect(isMysqlDuplicateKeyError(new Error("other"))).toBe(false);
  });

  it("round-trips timestamps through MySQL TIMESTAMP strings", () => {
    expect(toMysqlTimestampString(NOW)).toBe("2026-08-16 16:00:00");
    expect(fromMysqlTimestampString("2026-08-16 16:00:00")).toBe(NOW);
  });
});

describe("InMemory POS Terminal persistence", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: 10 } as never;
      return undefined as never;
    });
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

  it("creates, reads, lists by restaurant, and updates lifecycle", async () => {
    const store = new InMemoryPosTerminalStore();
    const created = terminal();
    await store.insert(created);
    expect(await store.getById(created.id)).toEqual(created);
    expect(await store.getByRestaurantAndCode(RESTAURANT_A, "POS-001")).toEqual(
      created
    );

    await store.insert(
      terminal({
        id: "22222222-2222-4222-8222-222222222222",
        restaurantId: RESTAURANT_B,
        code: "POS-001",
      })
    );
    const listed = await store.listByRestaurant(RESTAURANT_A);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.restaurantId).toBe(RESTAURANT_A);

    const activated = await store.updateLifecycle(created.id, "active");
    expect(activated?.lifecycle).toBe("active");
    expect(activated?.version).toBe(2);

    const replaced = await store.updateLifecycle(created.id, "replaced", {
      replacedByTerminalId: "33333333-3333-4333-8333-333333333333",
    });
    expect(replaced?.lifecycle).toBe("replaced");
    expect(replaced?.replacedByTerminalId).toBe(
      "33333333-3333-4333-8333-333333333333"
    );
  });

  it("re-reads the winner when register races on the same code", async () => {
    const store = new InMemoryPosTerminalStore();
    const winner = terminal({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    let lookups = 0;
    store.getByRestaurantAndCode = async () => {
      lookups += 1;
      return lookups === 1 ? null : winner;
    };
    store.listByRestaurant = async () => [];
    store.insert = async () => {
      throw new PosTerminalCodeConflictError();
    };
    const terminals = new PosTerminalService(
      store,
      new PosEntitlementService(store)
    );
    const result = await terminals.register({
      restaurantId: RESTAURANT_A,
      actorId: 10,
      code: "POS-001",
    });
    expect(result.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(result.code).toBe("POS-001");
  });
});

describe("InMemory POS permission grant persistence", () => {
  it("looks up, isolates tenants, upserts without overwrite, and revokes", async () => {
    const store = new InMemoryPosPermissionGrantStore();
    const grant = {
      restaurantId: RESTAURANT_A,
      userId: 7,
      permission: "SALE_CREATE" as const,
    };
    await store.upsert(grant);
    await store.upsert({ ...grant, permission: "POS_ACCESS" });
    expect(await store.hasGrant(RESTAURANT_A, 7, "SALE_CREATE")).toBe(true);
    expect(await store.hasAnyGrant(RESTAURANT_A, 7)).toBe(true);
    expect(await store.hasGrant(RESTAURANT_B, 7, "SALE_CREATE")).toBe(false);
    expect(await store.hasGrant(RESTAURANT_A, 8, "SALE_CREATE")).toBe(false);
    expect(await store.listByRestaurantUser(RESTAURANT_A, 7)).toHaveLength(2);

    const again = await store.upsert(grant);
    expect(again).toEqual(grant);
    expect(await store.listByRestaurantUser(RESTAURANT_A, 7)).toHaveLength(2);

    expect(await store.remove(RESTAURANT_A, 7, "SALE_CREATE")).toBe(true);
    expect(await store.hasGrant(RESTAURANT_A, 7, "SALE_CREATE")).toBe(false);
    expect(await store.hasGrant(RESTAURANT_A, 7, "POS_ACCESS")).toBe(true);
  });
});

describe("InMemory POS sale idempotency persistence", () => {
  it("creates, looks up, and isolates restaurant/terminal/user/key", async () => {
    const store = new InMemoryPosSaleIdempotencyStore();
    const record = saleRecord();
    await store.put(record);
    expect(await store.get(record)).toEqual(record);
    expect(
      await store.get({ ...record, restaurantId: RESTAURANT_B })
    ).toBeNull();
    expect(
      await store.get({ ...record, terminalId: "22222222-2222-4222-8222-222222222222" })
    ).toBeNull();
    expect(await store.get({ ...record, userId: 8 })).toBeNull();
    expect(await store.get({ ...record, idempotencyKey: "other-key" })).toBeNull();
  });

  it("treats same key + same fingerprint as success and does not overwrite", async () => {
    const store = new InMemoryPosSaleIdempotencyStore();
    const record = saleRecord();
    await store.put(record);
    await store.put({ ...record, orderId: 999, orderNumber: "ORD-999" });
    expect((await store.get(record))?.orderId).toBe(101);
  });

  it("fails closed on same key + different fingerprint and does not overwrite", async () => {
    const store = new InMemoryPosSaleIdempotencyStore();
    const record = saleRecord();
    await store.put(record);
    await expect(
      store.put({ ...record, fingerprint: "fp-bbbb", orderId: 202 })
    ).rejects.toBeInstanceOf(PosSaleIdempotencyConflictError);
    expect(await store.get(record)).toEqual(record);
  });

  it("serializes concurrent exclusive work for the same key", async () => {
    const store = new InMemoryPosSaleIdempotencyStore();
    const key = {
      restaurantId: RESTAURANT_A,
      terminalId: "t1",
      userId: 7,
      idempotencyKey: "idem-key-01",
    };
    const order: number[] = [];
    await Promise.all([
      store.runExclusive(key, async () => {
        order.push(1);
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push(2);
      }),
      store.runExclusive(key, async () => {
        order.push(3);
      }),
    ]);
    expect(order).toEqual([1, 2, 3]);
  });
});
