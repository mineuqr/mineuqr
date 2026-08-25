/**
 * POS-SALE-ORDER-IMPLEMENTATION-1 — POS Sale → canonical Order.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosSaleIdempotencyStore } from "../infrastructure/InMemoryPosSaleIdempotencyStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosSaleError, PosSaleService } from "../services/PosSaleService";
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
import { isPlatformOwner } from "../../platform-owner-access/identity";

const RESTAURANT_A = 1;
const RESTAURANT_B = 2;
const OWNER_A = 10;
const OWNER_B = 20;
const STAFF_A = 7;
const STAFF_B = 8;
const ADMIN = 3;
const PLATFORM = 500;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";
const TERMINAL_B = "66666666-6666-4666-8666-666666666666";

function user(id: number, role: SelectUser["role"] = "user"): SelectUser {
  return { id, role } as SelectUser;
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

async function seedTerminal(
  store: InMemoryPosTerminalStore,
  overrides?: Partial<{
    restaurantId: number;
    lifecycle: "registered" | "active" | "deactivated" | "replaced";
    id: string;
  }>
) {
  const terminal = {
    id: overrides?.id ?? TERMINAL_A,
    restaurantId: overrides?.restaurantId ?? RESTAURANT_A,
    code: overrides?.id === TERMINAL_B ? "POS-B01" : "POS-001",
    lifecycle: overrides?.lifecycle ?? ("active" as const),
    replacedByTerminalId: null,
    optionalDeviceId: null,
    version: 1,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  };
  await store.insert(terminal);
  return terminal;
}

function fakePlaceOrder(delayMs = 0) {
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
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
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

async function grantCashier(
  grants: InMemoryPosPermissionGrantStore,
  userId = STAFF_A,
  restaurantId = RESTAURANT_A,
  permissions: Array<"POS_ACCESS" | "SALE_CREATE"> = ["POS_ACCESS", "SALE_CREATE"]
) {
  for (const permission of permissions) {
    await grants.upsert({ userId, restaurantId, permission });
  }
}

function harness(options?: {
  place?: IdentityPlaceOrderService;
  sessions?: Array<{ id: number; restaurantId: number }>;
}) {
  const store = new InMemoryPosTerminalStore();
  const grants = new InMemoryPosPermissionGrantStore();
  const idempotency = new InMemoryPosSaleIdempotencyStore();
  const access = new PosAccessService(store, grants, new PosEntitlementService(store));
  const place = options?.place ?? fakePlaceOrder();
  const sessions = options?.sessions ?? [];
  const sale = new PosSaleService(
    grants,
    access,
    place,
    idempotency,
    async (sessionId) => {
      return sessions.find((row) => row.id === sessionId) ?? null;
    }
  );
  return { store, grants, access, place, sale, idempotency };
}

const validItems = [{ menuItemId: 41, quantity: 2, notes: "no onion", modifiers: ["large"] }];

describe("POS Sale → canonical Order", () => {
  beforeEach(() => {
    vi.mocked(isPlatformOwner).mockReturnValue(false);
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: OWNER_A } as never;
      if (id === RESTAURANT_B) return { id, userId: OWNER_B } as never;
      return undefined as never;
    });
    mockLimit(2);
  });

  it("creates a canonical cashier_pos Order when POS_ACCESS + SALE_CREATE are granted", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    const result = await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-01",
      },
    });
    expect(result.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(result.terminalId).toBe(TERMINAL_A);
    expect(result.cashierUserId).toBe(STAFF_A);
    expect(result.replayed).toBe(false);
    expect(result.orderId).toBeGreaterThan(0);
    expect(result.money.grandTotal).toBe("12.50");
    expect(result.lines).toHaveLength(1);
    expect(place.execute).toHaveBeenCalledTimes(1);
    expect(place.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: RESTAURANT_A,
        serviceMode: "counter",
        identityScope: "POS",
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        fulfilmentAnchor: expect.objectContaining({
          anchorType: "station",
          stationId: TERMINAL_A,
          fulfilmentLabel: TERMINAL_A,
        }),
        items: [
          expect.objectContaining({
            menuItemId: 41,
            quantity: 2,
            notes: "no onion",
            modifiers: ["large"],
          }),
        ],
      }),
      expect.objectContaining({ afterPersistInTransaction: expect.any(Function) })
    );
    expect(place.execute.mock.calls[0][0]).not.toHaveProperty("subtotal");
    expect(place.execute.mock.calls[0][0]).not.toHaveProperty("tax");
    expect(place.execute.mock.calls[0][0]).not.toHaveProperty("grandTotal");
    expect(place.execute.mock.calls[0][0]).not.toHaveProperty("sessionId");
  });

  it("denies POS_ACCESS without SALE_CREATE before placing an Order", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants, STAFF_A, RESTAURANT_A, ["POS_ACCESS"]);
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: validItems,
          idempotencyKey: "sale-key-02",
        },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    expect(place.execute).not.toHaveBeenCalled();
  });

  it("denies SALE_CREATE without POS_ACCESS", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants, STAFF_A, RESTAURANT_A, ["SALE_CREATE"]);
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: validItems,
          idempotencyKey: "sale-key-03",
        },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    expect(place.execute).not.toHaveBeenCalled();
  });

  it("denies owner, admin, and PLATFORM_OWNER without POS grants", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    vi.mocked(isPlatformOwner).mockReturnValue(true);
    await expect(
      sale.create({
        user: user(OWNER_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: validItems,
          idempotencyKey: "sale-key-owner",
        },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      sale.create({
        user: user(ADMIN, "admin"),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: validItems,
          idempotencyKey: "sale-key-admin",
        },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      sale.create({
        user: user(PLATFORM),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: validItems,
          idempotencyKey: "sale-key-platform",
        },
      })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(place.execute).not.toHaveBeenCalled();
  });

  it("denies inactive terminal even with SALE_CREATE", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store, { lifecycle: "deactivated" });
    await grantCashier(grants);
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: validItems,
          idempotencyKey: "sale-key-inactive",
        },
      })
    ).rejects.toMatchObject({ code: "terminal_inactive" });
    expect(place.execute).not.toHaveBeenCalled();
  });

  it("enforces restaurant and terminal tenant isolation", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await seedTerminal(store, { restaurantId: RESTAURANT_B, id: TERMINAL_B });
    await grantCashier(grants);
    await grantCashier(grants, STAFF_B, RESTAURANT_B);

    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_B,
          terminalId: TERMINAL_B,
          items: validItems,
          idempotencyKey: "sale-key-cross-rest",
        },
      })
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_B,
          items: validItems,
          idempotencyKey: "sale-key-cross-term",
        },
      })
    ).rejects.toMatchObject({ code: "terminal_foreign" });

    await expect(
      sale.create({
        user: user(STAFF_B),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: validItems,
          idempotencyKey: "sale-key-b-on-a",
        },
      })
    ).rejects.toBeInstanceOf(TRPCError);

    expect(place.execute).not.toHaveBeenCalled();
  });

  it("denies a cross-restaurant session and does not attach a same-restaurant session", async () => {
    const { store, grants, sale, place } = harness({
      sessions: [
        { id: 88, restaurantId: RESTAURANT_B },
        { id: 77, restaurantId: RESTAURANT_A },
      ],
    });
    await seedTerminal(store);
    await grantCashier(grants);

    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: validItems,
          sessionId: 88,
          idempotencyKey: "sale-key-session-b",
        },
      })
    ).rejects.toMatchObject({ code: "invalid_session" });

    const result = await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        sessionId: 77,
        idempotencyKey: "sale-key-session-a",
      },
    });
    expect(result.orderId).toBeGreaterThan(0);
    expect(place.execute.mock.calls[0][0]).not.toHaveProperty("sessionId");
    expect(place.execute.mock.calls[0][0]).not.toHaveProperty("sessionToken");
  });

  it("validates items, quantities, and modifiers after authorization", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants, STAFF_A, RESTAURANT_A, ["POS_ACCESS"]);
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: [],
          idempotencyKey: "sale-key-empty-unauth",
        },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });

    await grantCashier(grants);
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: [],
          idempotencyKey: "sale-key-empty",
        },
      })
    ).rejects.toMatchObject({ code: "empty_sale" });
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: [{ menuItemId: 0, quantity: 1 }],
          idempotencyKey: "sale-key-item",
        },
      })
    ).rejects.toMatchObject({ code: "invalid_item" });
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: [{ menuItemId: 41, quantity: 0 }],
          idempotencyKey: "sale-key-zero",
        },
      })
    ).rejects.toMatchObject({ code: "zero_quantity" });
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: [{ menuItemId: 41, quantity: -2 }],
          idempotencyKey: "sale-key-neg",
        },
      })
    ).rejects.toMatchObject({ code: "invalid_quantity" });
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: [{ menuItemId: 41, quantity: 1, modifiers: [" "] }],
          idempotencyKey: "sale-key-mod",
        },
      })
    ).rejects.toMatchObject({ code: "invalid_modifier" });
    expect(place.execute).not.toHaveBeenCalled();
  });

  it("ignores client cashier, channel, and financial totals and derives them server-side", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    const command = {
      restaurantId: RESTAURANT_A,
      terminalId: TERMINAL_A,
      items: validItems,
      idempotencyKey: "sale-key-client",
      cashierId: 9999,
      userId: 9999,
      channel: "qr",
      orderingChannel: "table_session",
      subtotal: "1.00",
      tax: "0.15",
      grandTotal: "999.00",
      discountTotal: "50.00",
    };
    const result = await sale.create({
      user: user(STAFF_A),
      command,
    });
    expect(result.cashierUserId).toBe(STAFF_A);
    expect(result.cashierUserId).not.toBe(9999);
    expect(result.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(place.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
      }),
      expect.objectContaining({ afterPersistInTransaction: expect.any(Function) })
    );
    const payload = place.execute.mock.calls[0][0];
    expect(payload).not.toHaveProperty("cashierId");
    expect(payload).not.toHaveProperty("grandTotal");
    expect(payload).not.toHaveProperty("subtotal");
  });

  it("replays the same canonical Order for the same idempotency key", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    const command = {
      restaurantId: RESTAURANT_A,
      terminalId: TERMINAL_A,
      items: validItems,
      idempotencyKey: "sale-key-retry",
    };
    const first = await sale.create({ user: user(STAFF_A), command });
    const second = await sale.create({ user: user(STAFF_A), command });
    expect(second.orderId).toBe(first.orderId);
    expect(second.replayed).toBe(true);
    expect(second.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(second.terminalId).toBe(TERMINAL_A);
    expect(place.execute).toHaveBeenCalledTimes(1);
  });

  it("allows an independent Sale for a different idempotency key", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    const first = await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-a",
      },
    });
    const second = await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-b",
      },
    });
    expect(second.orderId).not.toBe(first.orderId);
    expect(place.execute).toHaveBeenCalledTimes(2);
  });

  it("returns an idempotency conflict when the same key is reused with a different sale", async () => {
    const { store, grants, sale } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-conflict",
      },
    });
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: [{ menuItemId: 99, quantity: 1 }],
          idempotencyKey: "sale-key-conflict",
        },
      })
    ).rejects.toBeInstanceOf(PosSaleError);
    await expect(
      sale.create({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          items: [{ menuItemId: 99, quantity: 1 }],
          idempotencyKey: "sale-key-conflict",
        },
      })
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("collapses concurrent duplicate requests to one canonical Order", async () => {
    const place = fakePlaceOrder(25);
    const { store, grants, sale } = harness({ place });
    await seedTerminal(store);
    await grantCashier(grants);
    const command = {
      restaurantId: RESTAURANT_A,
      terminalId: TERMINAL_A,
      items: validItems,
      idempotencyKey: "sale-key-concurrent",
    };
    const [first, second] = await Promise.all([
      sale.create({ user: user(STAFF_A), command }),
      sale.create({ user: user(STAFF_A), command }),
    ]);
    expect(first.orderId).toBe(second.orderId);
    expect([first.replayed, second.replayed].filter(Boolean)).toHaveLength(1);
    expect(place.execute).toHaveBeenCalledTimes(1);
  });

  it("does not rewrite historical terminal or channel attribution on retry", async () => {
    const { store, grants, sale } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    const first = await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-hist",
      },
    });
    const replay = await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-hist",
      },
    });
    expect(replay.terminalId).toBe(first.terminalId);
    expect(replay.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(replay.cashierUserId).toBe(STAFF_A);
  });

  it("does not treat Operational Device identity as the POS Terminal", async () => {
    const { store, grants, sale, place } = harness();
    await seedTerminal(store);
    await grantCashier(grants);
    await sale.create({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        items: validItems,
        idempotencyKey: "sale-key-device",
      },
    });
    expect(place.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fulfilmentAnchor: expect.objectContaining({
          stationId: TERMINAL_A,
          fulfilmentLabel: TERMINAL_A,
        }),
      }),
      expect.objectContaining({ afterPersistInTransaction: expect.any(Function) })
    );
    expect(JSON.stringify(place.execute.mock.calls[0][0])).not.toContain("operational");
  });
});
