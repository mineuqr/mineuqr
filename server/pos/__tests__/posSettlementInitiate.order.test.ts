/**
 * POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1 — POS command → existing Check settle.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosSettlementInitiateIdempotencyStore } from "../infrastructure/InMemoryPosSettlementInitiateIdempotencyStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import {
  PosSettlementInitiateError,
  PosSettlementInitiateService,
} from "../services/PosSettlementInitiateService";
import { CheckTransitionError } from "../../operational-session/check/CheckService";
import type { SelectUser } from "../../../drizzle/schema";
import type { PosPermission } from "@shared/pos";
import type { SettlementContext } from "@shared/crmp";
import { PosRegisterShiftContextService } from "../services/PosRegisterShiftContextService";

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
const ORDER_A = 401;
const CHECK_A = 9001;
const GRAND_TOTAL = "42.50";
const REGISTER_ID = "reg_1_front";
const FINANCIAL_SHIFT_ID = "fs_1_open";

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

async function grantSettle(
  grants: InMemoryPosPermissionGrantStore,
  userId = STAFF_A,
  restaurantId = RESTAURANT_A,
  permissions: PosPermission[] = ["POS_ACCESS", "SETTLEMENT_INITIATE"]
) {
  for (const permission of permissions) {
    await grants.upsert({ userId, restaurantId, permission });
  }
}

function openCheck(overrides?: Partial<{
  id: number;
  restaurantId: number;
  sessionId: number | null;
  outcome: string;
  grandTotal: string;
}>) {
  return {
    id: overrides?.id ?? CHECK_A,
    restaurantId: overrides?.restaurantId ?? RESTAURANT_A,
    sessionId: overrides?.sessionId ?? null,
    outcome: overrides?.outcome ?? "open",
    grandTotal: overrides?.grandTotal ?? GRAND_TOTAL,
  };
}

function resolvedContext(
  overrides?: Partial<SettlementContext>
): SettlementContext {
  return {
    restaurantId: RESTAURANT_A,
    registerId: REGISTER_ID,
    financialShiftId: FINANCIAL_SHIFT_ID,
    operatorUserId: STAFF_A,
    deviceId: null,
    operationalScreenId: null,
    resolvedAt: "2026-08-16T00:00:00.000Z",
    status: "resolved",
    gaps: [],
    ...overrides,
  };
}

function harness(options?: {
  orders?: Array<{
    id: number;
    restaurantId: number;
    orderingChannel?: string | null;
    status?: string | null;
  }>;
  membership?: { checkId: number; checkOutcome: string } | null;
  check?: ReturnType<typeof openCheck> | null;
  settleDelayMs?: number;
  settleOnce?: boolean;
  settlementContext?: SettlementContext;
  ensureCheck?: (input: {
    restaurantId: number;
    orderId: number;
  }) => Promise<{ id: number; outcome: string }>;
}) {
  const store = new InMemoryPosTerminalStore();
  const grants = new InMemoryPosPermissionGrantStore();
  const idempotency = new InMemoryPosSettlementInitiateIdempotencyStore();
  const access = new PosAccessService(
    store,
    grants,
    new PosEntitlementService(store)
  );
  const orders = options?.orders ?? [
    {
      id: ORDER_A,
      restaurantId: RESTAURANT_A,
      orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
      status: "pending",
    },
  ];
  let liveCheck = options?.check === undefined ? openCheck() : options.check;
  const membership =
    options?.membership === undefined
      ? { checkId: CHECK_A, checkOutcome: "open" }
      : options.membership;
  const findMembership = vi.fn(async () => membership);
  const getCheck = vi.fn(async () => liveCheck);
  const settle = vi.fn(async (input: {
    restaurantId: number;
    checkId: number;
    settlementContextHints?: {
      registerId: string;
      operatorUserId: number;
      deviceId?: string | null;
    };
  }) => {
    if (options?.settleDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.settleDelayMs));
    }
    if (liveCheck && liveCheck.outcome !== "open") {
      throw new CheckTransitionError(
        `Cannot finalize check from outcome ${liveCheck.outcome}`
      );
    }
    liveCheck = {
      id: input.checkId,
      restaurantId: input.restaurantId,
      sessionId: liveCheck?.sessionId ?? null,
      outcome: "paid",
      grandTotal: liveCheck?.grandTotal ?? GRAND_TOTAL,
    };
    return {
      check: liveCheck,
      settlementRecordId: "sr-pos-1",
    };
  });
  const resolveContext = vi.fn(async () => options?.settlementContext ?? resolvedContext());
  const registerShift = new PosRegisterShiftContextService(
    resolveContext,
    async () => null
  );
  const service = new PosSettlementInitiateService(
    grants,
    access,
    idempotency,
    registerShift,
    async (orderId) => orders.find((row) => row.id === orderId) ?? null,
    findMembership,
    getCheck,
    settle,
    options?.ensureCheck ?? null
  );
  return {
    store,
    grants,
    access,
    service,
    settle,
    getCheck,
    findMembership,
    resolveContext,
  };
}

const command = {
  restaurantId: RESTAURANT_A,
  terminalId: TERMINAL_A,
  orderId: ORDER_A,
  idempotencyKey: "settle-key-01",
};

describe("POS Settlement Initiation → existing Check Domain", () => {
  beforeEach(() => {
    vi.mocked(isPlatformOwner).mockReturnValue(false);
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: OWNER_A } as never;
      if (id === RESTAURANT_B) return { id, userId: OWNER_B } as never;
      return undefined as never;
    });
    mockLimit(2);
  });

  it("lets an authorized cashier initiate settlement on the existing open Check", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({ user: user(STAFF_A), command });
    expect(result).toMatchObject({
      checkId: CHECK_A,
      orderId: ORDER_A,
      restaurantId: RESTAURANT_A,
      outcome: "paid",
      grandTotal: GRAND_TOTAL,
      settlementRecordId: "sr-pos-1",
      sessionId: null,
      orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
      terminalId: TERMINAL_A,
      cashierUserId: STAFF_A,
      registerId: REGISTER_ID,
      financialShiftId: FINANCIAL_SHIFT_ID,
      replayed: false,
    });
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      checkId: CHECK_A,
      settlementContextHints: {
        registerId: REGISTER_ID,
        operatorUserId: STAFF_A,
        deviceId: null,
      },
    });
    expect(settle.mock.calls[0][0]).not.toHaveProperty("settlements");
    expect(settle.mock.calls[0][0]).not.toHaveProperty("totalAmount");
    expect(settle.mock.calls[0][0]).not.toHaveProperty("registerId");
    expect(settle.mock.calls[0][0]).not.toHaveProperty("shiftId");
  });

  it("denies POS_ACCESS without SETTLEMENT_INITIATE and SETTLEMENT_INITIATE without POS_ACCESS", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants, STAFF_A, RESTAURANT_A, ["POS_ACCESS"]);
    await expect(
      service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });

    const onlySettle = harness();
    await seedTerminal(onlySettle.store);
    await grantSettle(onlySettle.grants, STAFF_A, RESTAURANT_A, [
      "SETTLEMENT_INITIATE",
    ]);
    await expect(
      onlySettle.service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    expect(settle).not.toHaveBeenCalled();
    expect(onlySettle.settle).not.toHaveBeenCalled();
  });

  it("denies owner, admin, and PLATFORM_OWNER without POS grants", async () => {
    const { store, service, settle } = harness();
    await seedTerminal(store);
    vi.mocked(isPlatformOwner).mockReturnValue(true);
    await expect(
      service.initiate({ user: user(OWNER_A), command })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      service.initiate({ user: user(ADMIN, "admin"), command })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      service.initiate({ user: user(PLATFORM), command })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(settle).not.toHaveBeenCalled();
  });

  it("denies inactive, replaced, and foreign terminals", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store, { lifecycle: "deactivated" });
    await grantSettle(grants);
    await expect(
      service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "terminal_inactive" });

    const replaced = harness();
    await seedTerminal(replaced.store, { lifecycle: "replaced" });
    await grantSettle(replaced.grants);
    await expect(
      replaced.service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "terminal_inactive" });

    const foreign = harness();
    await seedTerminal(foreign.store, {
      restaurantId: RESTAURANT_B,
      id: TERMINAL_B,
    });
    await grantSettle(foreign.grants);
    await expect(
      foreign.service.initiate({
        user: user(STAFF_A),
        command: { ...command, terminalId: TERMINAL_B },
      })
    ).rejects.toMatchObject({ code: "terminal_foreign" });
    expect(settle).not.toHaveBeenCalled();
  });

  it("enforces restaurant isolation for user, terminal, Order, and Check", async () => {
    const foreignOrder = harness({
      orders: [
        {
          id: ORDER_A,
          restaurantId: RESTAURANT_B,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        },
      ],
    });
    await seedTerminal(foreignOrder.store);
    await seedTerminal(foreignOrder.store, {
      restaurantId: RESTAURANT_B,
      id: TERMINAL_B,
    });
    await grantSettle(foreignOrder.grants);
    await grantSettle(foreignOrder.grants, STAFF_B, RESTAURANT_B);

    await expect(
      foreignOrder.service.initiate({
        user: user(STAFF_A),
        command: { ...command, restaurantId: RESTAURANT_B, terminalId: TERMINAL_B },
      })
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      foreignOrder.service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "order_wrong_restaurant" });

    await expect(
      foreignOrder.service.initiate({ user: user(STAFF_B), command })
    ).rejects.toBeInstanceOf(TRPCError);

    const foreignCheck = harness({
      check: openCheck({ restaurantId: RESTAURANT_B }),
    });
    await seedTerminal(foreignCheck.store);
    await grantSettle(foreignCheck.grants);
    await expect(
      foreignCheck.service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "check_wrong_restaurant" });
    expect(foreignOrder.settle).not.toHaveBeenCalled();
    expect(foreignCheck.settle).not.toHaveBeenCalled();
  });

  it("rejects a missing Check", async () => {
    const { store, grants, service, settle } = harness({
      membership: null,
      check: null,
    });
    await seedTerminal(store);
    await grantSettle(grants);
    await expect(
      service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "check_not_found" });
    expect(settle).not.toHaveBeenCalled();
  });

  it("ensures a Check when membership is not ready yet then settles", async () => {
    const { store, grants, service, settle } = harness({
      membership: null,
      check: openCheck(),
      ensureCheck: async () => ({ id: CHECK_A, outcome: "open" }),
    });
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({ user: user(STAFF_A), command });
    expect(result.outcome).toBe("paid");
    expect(result.checkId).toBe(CHECK_A);
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("rejects already terminal Checks", async () => {
    for (const outcome of ["paid", "complimentary", "voided"] as const) {
      const { store, grants, service, settle } = harness({
        check: openCheck({ outcome }),
        membership: { checkId: CHECK_A, checkOutcome: outcome },
      });
      await seedTerminal(store);
      await grantSettle(grants);
      await expect(
        service.initiate({ user: user(STAFF_A), command })
      ).rejects.toMatchObject({ code: "check_already_terminal" });
      expect(settle).not.toHaveBeenCalled();
    }
  });

  it("rejects an invalid Check lifecycle", async () => {
    const { store, grants, service, settle } = harness({
      check: openCheck({ outcome: "unknown" }),
    });
    await seedTerminal(store);
    await grantSettle(grants);
    await expect(
      service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "check_not_eligible" });
    expect(settle).not.toHaveBeenCalled();
  });

  it("ignores client cashier, totals, channel, and restaurant identity extras", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({
      user: user(STAFF_A),
      command: {
        ...command,
        cashierId: 9999,
        userId: 9999,
        channel: "qr",
        grandTotal: "999.00",
        totalAmount: "999.00",
        tax: "1.00",
      } as typeof command,
    });
    expect(result.cashierUserId).toBe(STAFF_A);
    expect(result.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(result.grandTotal).toBe(GRAND_TOTAL);
    expect(result.outcome).toBe("paid");
    expect(settle).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      checkId: CHECK_A,
      settlementContextHints: {
        registerId: REGISTER_ID,
        operatorUserId: STAFF_A,
        deviceId: null,
      },
    });
  });

  it("forwards existing Check settlement lines for a split payment mix", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({
      user: user(STAFF_A),
      command: {
        ...command,
        paymentMethod: "cash",
        settlements: [
          { paymentMethod: "cash", amount: "6.00" },
          { paymentMethod: "card", amount: "36.50" },
        ],
      },
    });
    expect(result.outcome).toBe("paid");
    expect(settle).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      checkId: CHECK_A,
      settlementContextHints: {
        registerId: REGISTER_ID,
        operatorUserId: STAFF_A,
        deviceId: null,
      },
      settlements: [
        { paymentMethod: "cash", amount: "6.00" },
        { paymentMethod: "card", amount: "36.50" },
      ],
    });
  });

  it("conflicts when the same idempotency key is reused for a different payment mix", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    await service.initiate({
      user: user(STAFF_A),
      command: {
        ...command,
        paymentMethod: "cash",
        settlements: [
          { paymentMethod: "cash", amount: "6.00" },
          { paymentMethod: "card", amount: "36.50" },
        ],
      },
    });
    await expect(
      service.initiate({
        user: user(STAFF_A),
        command: {
          ...command,
          paymentMethod: "card",
        },
      })
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("replays the same split payment mix without a second Check settle", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    const split = {
      ...command,
      paymentMethod: "cash" as const,
      settlements: [
        { paymentMethod: "cash" as const, amount: "6.00" },
        { paymentMethod: "card" as const, amount: "36.50" },
      ],
    };
    const first = await service.initiate({ user: user(STAFF_A), command: split });
    const second = await service.initiate({ user: user(STAFF_A), command: split });
    expect(second.checkId).toBe(first.checkId);
    expect(second.replayed).toBe(true);
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("overlaps register-shift resolution with Check membership lookup", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    const idempotency = new InMemoryPosSettlementInitiateIdempotencyStore();
    const access = new PosAccessService(
      store,
      grants,
      new PosEntitlementService(store)
    );
    let membershipStarted = 0;
    let shiftStarted = 0;
    const findMembership = vi.fn(async () => {
      membershipStarted = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 40));
      return { checkId: CHECK_A, checkOutcome: "open" };
    });
    const resolveContext = vi.fn(async () => {
      shiftStarted = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 40));
      return resolvedContext();
    });
    const registerShift = new PosRegisterShiftContextService(
      resolveContext,
      async () => null
    );
    const settle = vi.fn(async () => ({
      check: openCheck({ outcome: "paid" }),
      settlementRecordId: "sr-pos-1",
    }));
    const service = new PosSettlementInitiateService(
      grants,
      access,
      idempotency,
      registerShift,
      async () => ({
        id: ORDER_A,
        restaurantId: RESTAURANT_A,
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        status: "pending",
      }),
      findMembership,
      async () => openCheck(),
      settle
    );
    await seedTerminal(store);
    await grantSettle(grants);
    await service.initiate({ user: user(STAFF_A), command });
    expect(findMembership).toHaveBeenCalledTimes(1);
    expect(resolveContext).toHaveBeenCalledTimes(1);
    expect(Math.abs(membershipStarted - shiftStarted)).toBeLessThan(20);
  });

  it("forwards a selectable payment method to Check as a single tender without client amounts", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({
      user: user(STAFF_A),
      command: {
        ...command,
        paymentMethod: "cash",
      },
    });
    expect(result.outcome).toBe("paid");
    expect(result.grandTotal).toBe(GRAND_TOTAL);
    expect(settle).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      checkId: CHECK_A,
      settlementContextHints: {
        registerId: REGISTER_ID,
        operatorUserId: STAFF_A,
        deviceId: null,
      },
      settlements: [{ paymentMethod: "cash" }],
    });
  });

  it("replays the canonical prior result for the same idempotency key", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    const first = await service.initiate({ user: user(STAFF_A), command });
    const second = await service.initiate({ user: user(STAFF_A), command });
    expect(second.checkId).toBe(first.checkId);
    expect(second.grandTotal).toBe(first.grandTotal);
    expect(second.settlementRecordId).toBe(first.settlementRecordId);
    expect(second.replayed).toBe(true);
    expect(second.outcome).toBe("paid");
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("returns an idempotency conflict when the same key is reused for a different Order", async () => {
    const { store, grants, service } = harness({
      orders: [
        {
          id: ORDER_A,
          restaurantId: RESTAURANT_A,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        },
        {
          id: 402,
          restaurantId: RESTAURANT_A,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        },
      ],
    });
    await seedTerminal(store);
    await grantSettle(grants);
    await service.initiate({ user: user(STAFF_A), command });
    await expect(
      service.initiate({
        user: user(STAFF_A),
        command: { ...command, orderId: 402 },
      })
    ).rejects.toBeInstanceOf(PosSettlementInitiateError);
    await expect(
      service.initiate({
        user: user(STAFF_A),
        command: { ...command, orderId: 402 },
      })
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("collapses concurrent duplicate requests to one Check settle", async () => {
    const { store, grants, service, settle } = harness({ settleDelayMs: 20 });
    await seedTerminal(store);
    await grantSettle(grants);
    const [first, second] = await Promise.all([
      service.initiate({ user: user(STAFF_A), command }),
      service.initiate({ user: user(STAFF_A), command }),
    ]);
    expect(first.checkId).toBe(second.checkId);
    expect(first.grandTotal).toBe(second.grandTotal);
    expect([first.replayed, second.replayed].filter(Boolean)).toHaveLength(1);
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("treats a lost Check CAS race as a safe already-paid result", async () => {
    const { store, grants, service, settle, getCheck } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    let lookups = 0;
    getCheck.mockImplementation(async () => {
      lookups += 1;
      return openCheck({
        outcome: lookups === 1 ? "open" : "paid",
        grandTotal: GRAND_TOTAL,
      });
    });
    settle.mockRejectedValue(
      new CheckTransitionError("Cannot finalize check from outcome paid")
    );
    const result = await service.initiate({ user: user(STAFF_A), command });
    expect(result.outcome).toBe("paid");
    expect(result.grandTotal).toBe(GRAND_TOTAL);
    expect(result.replayed).toBe(true);
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing Order", async () => {
    const { store, grants, service, settle } = harness({ orders: [] });
    await seedTerminal(store);
    await grantSettle(grants);
    await expect(
      service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "order_not_found" });
    expect(settle).not.toHaveBeenCalled();
  });

  it("rejects settlement without resolved CRMP Register/Shift context", async () => {
    const { store, grants, service, settle } = harness({
      settlementContext: resolvedContext({
        registerId: null,
        financialShiftId: null,
        status: "unavailable",
        gaps: ["no_operational_hints"],
      }),
    });
    await seedTerminal(store);
    await grantSettle(grants);
    await expect(
      service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "register_required" });
    expect(settle).not.toHaveBeenCalled();
  });

  it("rejects a closed Register and a missing Financial Shift", async () => {
    const closed = harness({
      settlementContext: resolvedContext({
        financialShiftId: null,
        status: "partial",
        gaps: ["register_duty_closed"],
      }),
    });
    await seedTerminal(closed.store);
    await grantSettle(closed.grants);
    await expect(
      closed.service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "register_closed" });
    expect(closed.settle).not.toHaveBeenCalled();

    const noShift = harness({
      settlementContext: resolvedContext({
        financialShiftId: null,
        status: "partial",
        gaps: ["no_active_shift"],
      }),
    });
    await seedTerminal(noShift.store);
    await grantSettle(noShift.grants);
    await expect(
      noShift.service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "shift_required" });
    expect(noShift.settle).not.toHaveBeenCalled();
  });

  it("rejects a Register from another restaurant and ignores client register/shift ids", async () => {
    const { store, grants, service, settle } = harness({
      settlementContext: resolvedContext({ restaurantId: RESTAURANT_B }),
    });
    await seedTerminal(store);
    await grantSettle(grants);
    await expect(
      service.initiate({
        user: user(STAFF_A),
        command: {
          ...command,
          registerId: "reg_forged",
          shiftId: "fs_forged",
        } as typeof command,
      })
    ).rejects.toMatchObject({ code: "register_wrong_restaurant" });
    expect(settle).not.toHaveBeenCalled();
  });

  it("uses canonical CRMP Register/Shift and does not rewrite Order channel", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({ user: user(STAFF_A), command });
    expect(result.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(result.registerId).toBe(REGISTER_ID);
    expect(result.financialShiftId).toBe(FINANCIAL_SHIFT_ID);
    expect(settle.mock.calls[0][0]).not.toHaveProperty("registerId");
    expect(settle.mock.calls[0][0]).not.toHaveProperty("shiftId");
    expect(settle.mock.calls[0][0].settlementContextHints.registerId).toBe(
      REGISTER_ID
    );
  });
});
