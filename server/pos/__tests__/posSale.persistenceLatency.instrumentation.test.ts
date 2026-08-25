/**
 * POS-SALE-PERSISTENCE-LATENCY-INSTRUMENTATION-1
 * Timing-only observability on pos.sale.create. No command-behavior change.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import {
  getOrderLifecycleLatencyAggregate,
  resetOrderLifecycleLatencyAggregateForTests,
} from "@shared/order-lifecycle-latency";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosSaleIdempotencyStore } from "../infrastructure/InMemoryPosSaleIdempotencyStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosSaleService } from "../services/PosSaleService";
import type { IdentityPlaceOrderService } from "../../order/application/IdentityPlaceOrderService";
import { noteOrderLifecyclePhase } from "../../order/observability/orderLifecycleLatency";
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
import { isPlatformOwner } from "../../platform-owner-access/identity";
import { opsLog } from "../../_core/opsLog";

const RESTAURANT_A = 1;
const OWNER_A = 10;
const STAFF_A = 7;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";

const STAGE_KEYS = [
  "idempotency_wait_ms",
  "idempotency_get_ms",
  "pricing_ms",
  "number_ms",
  "persist_ms",
  "restaurant_lock_ms",
  "order_insert_ms",
  "order_lines_ms",
  "accept_update_ms",
  "outbox_ms",
  "idempotency_put_ms",
  "commit_ms",
] as const;

function user(id: number): SelectUser {
  return { id, role: "user" } as SelectUser;
}

function mockLimit(cap: number | null) {
  vi.mocked(checkLimit).mockImplementation(async ({ proposedTotal }) => {
    if (cap === null) {
      return {
        allowed: true,
        reasonCode: "unlimited",
        limitKey: "posTerminals",
        cap: null,
        proposedTotal,
        policy: "unlimited",
        source: "test",
      };
    }
    const allowed = proposedTotal <= cap;
    return {
      allowed,
      reasonCode: allowed ? "within_limit" : "limit_exceeded",
      limitKey: "posTerminals",
      cap,
      proposedTotal,
      policy: "hard",
      source: "test",
    };
  });
}

async function seedTerminal(store: InMemoryPosTerminalStore) {
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
}

function fakePlaceOrder(options?: { recordStages?: boolean }) {
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
      if (options?.recordStages) {
        noteOrderLifecyclePhase("pricing_ms", 11);
        noteOrderLifecyclePhase("number_ms", 12);
        noteOrderLifecyclePhase("persist_ms", 13);
        noteOrderLifecyclePhase("restaurant_lock_ms", 21);
        noteOrderLifecyclePhase("order_insert_ms", 22);
        noteOrderLifecyclePhase("order_lines_ms", 23);
        noteOrderLifecyclePhase("accept_update_ms", 24);
        noteOrderLifecyclePhase("outbox_ms", 14);
        noteOrderLifecyclePhase("commit_ms", 15);
      }
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
      if (persist?.afterPersistInTransaction) {
        await persist.afterPersistInTransaction(
          {},
          {
            order,
            outboxEventIds: [],
            businessIdentity: {
              businessDay: "2026-08-16",
              dailyDisplayNumber: seq,
              identityScope: "POS",
            },
          }
        );
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

class CountingIdempotencyStore extends InMemoryPosSaleIdempotencyStore {
  getCalls = 0;
  putInTransactionCalls = 0;

  override async get(
    input: Parameters<InMemoryPosSaleIdempotencyStore["get"]>[0]
  ) {
    this.getCalls += 1;
    return super.get(input);
  }

  override async putInTransaction(
    tx: unknown,
    record: Parameters<InMemoryPosSaleIdempotencyStore["putInTransaction"]>[1]
  ) {
    this.putInTransactionCalls += 1;
    return super.putInTransaction(tx, record);
  }
}

async function grantCashier(grants: InMemoryPosPermissionGrantStore) {
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
}

function harness(options?: {
  place?: IdentityPlaceOrderService;
  idempotency?: InMemoryPosSaleIdempotencyStore;
}) {
  const store = new InMemoryPosTerminalStore();
  const grants = new InMemoryPosPermissionGrantStore();
  const idempotency = options?.idempotency ?? new InMemoryPosSaleIdempotencyStore();
  const access = new PosAccessService(
    store,
    grants,
    new PosEntitlementService(store)
  );
  const place = options?.place ?? fakePlaceOrder();
  const sale = new PosSaleService(
    grants,
    access,
    place,
    idempotency,
    undefined,
    async () => stubCheckSnapshots(),
    async () => stubOpenCheckEnrollment()
  );
  return { store, grants, place, sale, idempotency };
}

const validItems = [{ menuItemId: 41, quantity: 2 }];

function posSaleCreatedEvent(): { type?: string; restaurantId?: number | null; metadata?: Record<string, unknown> } {
  const event = vi.mocked(opsLog).mock.calls
    .map((call) => call[0])
    .find((payload) => payload?.type === "pos_sale_created");
  expect(event).toBeDefined();
  return event as {
    type?: string;
    restaurantId?: number | null;
    metadata?: Record<string, unknown>;
  };
}

describe("POS-SALE-PERSISTENCE-LATENCY-INSTRUMENTATION-1", () => {
  beforeEach(() => {
    vi.mocked(opsLog).mockClear();
    vi.mocked(isPlatformOwner).mockReturnValue(false);
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: OWNER_A } as never;
      return undefined as never;
    });
    mockLimit(2);
    resetOrderLifecycleLatencyAggregateForTests();
  });

  it("emits pos_sale_created with persistExclusiveMs and stage timing fields", async () => {
    const { store, grants, sale } = harness({
      place: fakePlaceOrder({ recordStages: true }),
    });
    await seedTerminal(store);
    await grantCashier(grants);
    await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-timing-01",
      },
    });

    const event = posSaleCreatedEvent();
    const metadata = event.metadata ?? {};
    expect(event.restaurantId).toBe(RESTAURANT_A);
    expect(metadata.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(metadata.orderId).toBeGreaterThan(0);
    expect(metadata.terminalId).toBe(TERMINAL_A);
    expect(metadata.sessionPersistence).toBe("ephemeral");
    expect(metadata.persistExclusiveMs).toEqual(expect.any(Number));
    expect(metadata.persistExclusiveMs as number).toBeGreaterThanOrEqual(0);

    for (const key of STAGE_KEYS) {
      expect(metadata).toHaveProperty(key);
      expect(metadata[key]).toEqual(expect.any(Number));
      expect(metadata[key] as number).toBeGreaterThanOrEqual(0);
    }
    expect(metadata.pricing_ms).toBe(11);
    expect(metadata.number_ms).toBe(12);
    expect(metadata.persist_ms).toBe(13);
    expect(metadata.restaurant_lock_ms).toBe(21);
    expect(metadata.order_insert_ms).toBe(22);
    expect(metadata.order_lines_ms).toBe(23);
    expect(metadata.accept_update_ms).toBe(24);
    expect(metadata.outbox_ms).toBe(14);
    expect(metadata.commit_ms).toBe(15);
    expect(metadata.idempotency_put_ms).toEqual(expect.any(Number));
    expect(metadata.idempotency_put_ms as number).toBeGreaterThanOrEqual(0);
  });

  it("does not change sale result, replay, or duplicate protection", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    const command = {
      restaurantId: RESTAURANT_A,
      terminalId: TERMINAL_A,
      items: validItems,
      idempotencyKey: "sale-key-timing-replay",
    };
    const first = await sale.create({ user: user(STAFF_A), command });
    const second = await sale.create({ user: user(STAFF_A), command });
    expect(first.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(first.replayed).toBe(false);
    expect(second.orderId).toBe(first.orderId);
    expect(second.replayed).toBe(true);
    expect(place.execute).toHaveBeenCalledTimes(1);
    expect(place.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        identityScope: "POS",
      }),
      expect.objectContaining({
        afterPersistInTransaction: expect.any(Function),
        enrollCheck: false,
      })
    );
  });

  it("does not add extra idempotency get or put queries on a first sale", async () => {
    const idempotency = new CountingIdempotencyStore();
    const { store, grants, sale, place } = harness({ idempotency });
    await seedTerminal(store);
    await grantCashier(grants);
    await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-timing-queries",
      },
    });
    expect(place.execute).toHaveBeenCalledTimes(1);
    expect(idempotency.getCalls).toBe(1);
    expect(idempotency.putInTransactionCalls).toBe(1);
  });

  it("does not emit a competing lifecycle summary event", async () => {
    const { store, grants, sale } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-timing-no-summary",
      },
    });
    expect(getOrderLifecycleLatencyAggregate().count).toBe(0);
    const types = vi.mocked(opsLog).mock.calls.map((call) => call[0]?.type);
    expect(types).toContain("pos_sale_created");
    expect(types).not.toContain("order_lifecycle_latency_summary");
  });
});
