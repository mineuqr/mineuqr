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
import { CollectionFactError } from "@shared/operational-session/payment/collection-fact";
import type { SelectUser } from "../../../drizzle/schema";
import type { PosPermission } from "@shared/pos";
import type { SettlementContext } from "@shared/crmp";
import { PosRegisterShiftContextService } from "../services/PosRegisterShiftContextService";
import { findProductionCollectionFactByOrderId } from "../../operational-session/payment/collection-fact/collectionFactRepository";

vi.mock("../../operational-session/payment/collection-fact/collectionFactRepository", () => ({
  findProductionCollectionFactByOrderId: vi.fn(async () => null),
}));
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
import { opsLog } from "../../_core/opsLog";

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
  settleCheckOutcome?: "paid" | "open";
  settleSettlementRecordId?: string | null;
  finalizeStageMs?: {
    checkReloadMs: number;
    orderDiscoveryMs: number;
    contextResolveMs: number;
    moneyTxMs: number;
    attributionMs: number;
  };
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
    orderId: number;
    billDiscountAmount?: string;
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
      id: liveCheck?.id ?? CHECK_A,
      restaurantId: input.restaurantId,
      sessionId: liveCheck?.sessionId ?? null,
      outcome: options?.settleCheckOutcome ?? "paid",
      grandTotal: liveCheck?.grandTotal ?? GRAND_TOTAL,
    };
    return {
      check: liveCheck,
      settlementRecordId:
        options?.settleSettlementRecordId === undefined
          ? "sr-pos-1"
          : options.settleSettlementRecordId,
      ...(options?.finalizeStageMs
        ? { finalizeStageMs: options.finalizeStageMs }
        : {}),
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
    settle
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
  paymentIntentId: "cpi_test-intent-01",
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
    vi.mocked(findProductionCollectionFactByOrderId).mockResolvedValue(null);
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
      orderId: ORDER_A,
      billDiscountAmount: undefined,
      settlementContext: resolvedContext(),
      settlementContextHints: {
        registerId: REGISTER_ID,
        operatorUserId: STAFF_A,
        deviceId: null,
      },
      paymentIntentId: "cpi_test-intent-01",
      idempotencyKey: "settle-key-01",
      terminalId: TERMINAL_A,
      actorUserId: STAFF_A,
    });
    expect(settle.mock.calls[0][0]).not.toHaveProperty("settlements");
    expect(settle.mock.calls[0][0]).not.toHaveProperty("totalAmount");
    expect(settle.mock.calls[0][0]).not.toHaveProperty("registerId");
    expect(settle.mock.calls[0][0]).not.toHaveProperty("shiftId");
  });

  it("rejects a paymentIntentId that equals orderId before settle", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    await expect(
      service.initiate({
        user: user(STAFF_A),
        command: { ...command, paymentIntentId: String(ORDER_A) },
      })
    ).rejects.toMatchObject({ code: "invalid_payment_intent" });
    expect(settle).not.toHaveBeenCalled();
  });

  it("does not treat Collection Fact storage failure as a paid settle", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    settle.mockRejectedValueOnce(
      new CollectionFactError("STORAGE", "disk full")
    );
    await expect(
      service.initiate({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "collection_fact_rejected" });
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

    expect(foreignOrder.settle).not.toHaveBeenCalled();
  });

  it("returns HTTP paid after Collection Fact when Check is still OPEN", async () => {
    const { store, grants, service, settle } = harness({
      membership: null,
      check: null,
      settleCheckOutcome: "open",
      settleSettlementRecordId: null,
    });
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({ user: user(STAFF_A), command });
    expect(result.outcome).toBe("paid");
    expect(result.checkId).toBe(CHECK_A);
    expect(result.settlementRecordId).toBeNull();
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("initiates Confirm without a pre-existing Check", async () => {
    const { store, grants, service, settle } = harness({
      membership: null,
      check: null,
    });
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({ user: user(STAFF_A), command });
    expect(result.outcome).toBe("paid");
    expect(result.checkId).toBe(CHECK_A);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: RESTAURANT_A,
        orderId: ORDER_A,
      })
    );
  });

  it("does not treat a paid Check without Collection Fact as Cashier payment authority", async () => {
    const { store, grants, service, settle } = harness({
      check: openCheck({ outcome: "paid" }),
      membership: { checkId: CHECK_A, checkOutcome: "paid" },
    });
    await seedTerminal(store);
    await grantSettle(grants);
    await expect(service.initiate({ user: user(STAFF_A), command })).rejects.toMatchObject({
      code: "check_already_terminal",
    });
    expect(settle).not.toHaveBeenCalled();
  });

  it("replays POS idempotency without triggering downstream recovery", async () => {
    const { store, grants, service, settle } = harness({
      membership: null,
      check: null,
    });
    await seedTerminal(store);
    await grantSettle(grants);
    await service.initiate({ user: user(STAFF_A), command });
    const result = await service.initiate({ user: user(STAFF_A), command });
    expect(result.replayed).toBe(true);
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("rejects complimentary and voided Checks", async () => {
    for (const outcome of ["complimentary", "voided"] as const) {
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
      membership: { checkId: CHECK_A, checkOutcome: "unknown" },
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
      orderId: ORDER_A,
      billDiscountAmount: undefined,
      settlementContext: resolvedContext(),
      settlementContextHints: {
        registerId: REGISTER_ID,
        operatorUserId: STAFF_A,
        deviceId: null,
      },
      paymentIntentId: "cpi_test-intent-01",
      idempotencyKey: "settle-key-01",
      terminalId: TERMINAL_A,
      actorUserId: STAFF_A,
    });
  });

  it("replays an existing production Collection Fact without creating another financial commit", async () => {
    vi.mocked(findProductionCollectionFactByOrderId).mockResolvedValue({
      collectionFactId: "pcf_existing",
      checkId: CHECK_A,
      amount: GRAND_TOTAL,
      paymentIntentId: "cpi_prior",
    } as never);
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    const result = await service.initiate({
      user: user(STAFF_A),
      command: {
        ...command,
        idempotencyKey: "settle-key-new",
        paymentIntentId: "cpi_new-intent",
      },
    });
    expect(result.replayed).toBe(true);
    expect(result.outcome).toBe("paid");
    expect(result.checkId).toBe(CHECK_A);
    expect(settle).not.toHaveBeenCalled();
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
      orderId: ORDER_A,
      billDiscountAmount: undefined,
      settlementContext: resolvedContext(),
      settlementContextHints: {
        registerId: REGISTER_ID,
        operatorUserId: STAFF_A,
        deviceId: null,
      },
      paymentIntentId: "cpi_test-intent-01",
      idempotencyKey: "settle-key-01",
      terminalId: TERMINAL_A,
      actorUserId: STAFF_A,
      settlements: [
        { paymentMethod: "cash", amount: "6.00" },
        { paymentMethod: "card", amount: "36.50" },
      ],
    });
  });

  it("forwards discount intent on Confirm and does not accept client grandTotal", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    await service.initiate({
      user: user(STAFF_A),
      command: {
        ...command,
        billDiscountAmount: "2.00",
        grandTotal: "999.00",
      } as typeof command,
    });
    expect(settle).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: ORDER_A,
        billDiscountAmount: "2.00",
      })
    );
    expect(settle.mock.calls[0][0]).not.toHaveProperty("grandTotal");
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
      orderId: ORDER_A,
      billDiscountAmount: undefined,
      settlementContext: resolvedContext(),
      settlementContextHints: {
        registerId: REGISTER_ID,
        operatorUserId: STAFF_A,
        deviceId: null,
      },
      paymentIntentId: "cpi_test-intent-01",
      idempotencyKey: "settle-key-01",
      terminalId: TERMINAL_A,
      actorUserId: STAFF_A,
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

  it("replays a committed Collection Fact after a lost Check CAS race", async () => {
    const { store, grants, service, settle } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    vi.mocked(findProductionCollectionFactByOrderId)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        collectionFactId: "pcf_raced",
        checkId: CHECK_A,
        amount: GRAND_TOTAL,
        paymentIntentId: command.paymentIntentId,
      } as never);
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
    expect(settle.mock.calls[0][0].settlementContext.registerId).toBe(
      REGISTER_ID
    );
  });

  it("emits pos_settlement_initiate duration telemetry without tender amounts", async () => {
    vi.mocked(opsLog).mockClear();
    const { store, grants, service } = harness();
    await seedTerminal(store);
    await grantSettle(grants);
    await service.initiate({ user: user(STAFF_A), command });
    const event = vi.mocked(opsLog).mock.calls
      .map((call) => call[0])
      .find((row) => row?.type === "pos_settlement_initiate");
    expect(event).toBeDefined();
    expect(event?.metadata).toEqual(
      expect.objectContaining({
        orderId: ORDER_A,
        checkId: CHECK_A,
        terminalId: TERMINAL_A,
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        durationMs: expect.any(Number),
        startedAt: expect.any(String),
        completedAt: expect.any(String),
        authMs: expect.any(Number),
        orderLoadMs: expect.any(Number),
        settlementContextMs: expect.any(Number),
        checkLoadMs: expect.any(Number),
        financialTxnMs: expect.any(Number),
      })
    );
    expect((event?.metadata?.durationMs as number) >= 0).toBe(true);
    expect(event?.metadata).not.toHaveProperty("grandTotal");
    expect(event?.metadata).not.toHaveProperty("taxAmount");
    expect(event?.metadata).not.toHaveProperty("subtotal");
    expect(event?.metadata?.checkReloadMs).toBeNull();
    expect(event?.metadata?.orderDiscoveryMs).toBeNull();
    expect(event?.metadata?.contextResolveMs).toBeNull();
    expect(event?.metadata?.moneyTxMs).toBeNull();
    expect(event?.metadata?.attributionMs).toBeNull();
    expect(event?.metadata?.validationMs).toBeNull();
    expect(event?.metadata?.financialTransactionCommitMs).toBeNull();
    expect(event?.metadata?.financialTransactionWriteMs).toBeNull();
    expect(event?.metadata?.unexplainedGapMs).toBeNull();
    expect(event?.metadata?.responseConstructionMs).toEqual(expect.any(Number));
    expect(event?.metadata?.totalHttpDurationMs).toEqual(expect.any(Number));
    expect(event?.metadata?.ensureCheckMs).toBe(0);
  });

  it("emits financialTxn stage timings without financial amounts when Check stages are present", async () => {
    vi.mocked(opsLog).mockClear();
    const stages = {
      checkReloadMs: 11,
      orderDiscoveryMs: 22,
      contextResolveMs: 33,
      moneyTxMs: 44,
      attributionMs: 55,
    };
    const { store, grants, service } = harness({ finalizeStageMs: stages });
    await seedTerminal(store);
    await grantSettle(grants);
    await service.initiate({ user: user(STAFF_A), command });
    const event = vi.mocked(opsLog).mock.calls
      .map((call) => call[0])
      .find((row) => row?.type === "pos_settlement_initiate");
    expect(event?.metadata).toEqual(
      expect.objectContaining({
        orderId: ORDER_A,
        checkId: CHECK_A,
        checkReloadMs: 11,
        orderDiscoveryMs: 22,
        contextResolveMs: 33,
        moneyTxMs: 44,
        attributionMs: 55,
        financialTransactionTotalMs: 44,
        financialTransactionCommitMs: null,
        validationMs: null,
        responseConstructionMs: expect.any(Number),
        unaccountedMs: expect.any(Number),
      })
    );
    const envelope = event?.metadata?.financialTxnMs as number;
    expect(event?.metadata?.unexplainedGapMs).toBe(
      envelope - (11 + 22 + 33 + 44 + 55)
    );
    expect(event?.metadata).not.toHaveProperty("grandTotal");
    expect(event?.metadata).not.toHaveProperty("taxAmount");
    expect(event?.metadata).not.toHaveProperty("subtotal");
    expect(JSON.stringify(event?.metadata)).not.toMatch(/tender|grandTotal|taxAmount/i);
  });
});
