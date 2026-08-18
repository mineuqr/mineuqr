/**
 * POS-CHECK-INTAKE-IMPLEMENTATION-1 — POS Check Intake → existing Check Domain.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { ORDERING_CHANNEL_CASHIER_POS } from "../../../shared/ordering-platform/orderingChannelRegistry";
import { InMemoryPosCheckIntakeIdempotencyStore } from "../infrastructure/InMemoryPosCheckIntakeIdempotencyStore";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import {
  PosCheckIntakeError,
  PosCheckIntakeService,
} from "../services/PosCheckIntakeService";
import { CheckMembershipError } from "../../operational-session/check/checkMembershipService";
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

async function grantIntake(
  grants: InMemoryPosPermissionGrantStore,
  userId = STAFF_A,
  restaurantId = RESTAURANT_A,
  permissions: Array<"POS_ACCESS" | "CHECK_INTAKE"> = ["POS_ACCESS", "CHECK_INTAKE"]
) {
  for (const permission of permissions) {
    await grants.upsert({ userId, restaurantId, permission });
  }
}

function harness(options?: {
  orders?: Array<{
    id: number;
    restaurantId: number;
    orderingChannel?: string | null;
    status?: string | null;
  }>;
  ensureDelayMs?: number;
}) {
  const store = new InMemoryPosTerminalStore();
  const grants = new InMemoryPosPermissionGrantStore();
  const idempotency = new InMemoryPosCheckIntakeIdempotencyStore();
  const access = new PosAccessService(store, grants, new PosEntitlementService(store));
  const orders = options?.orders ?? [
    {
      id: ORDER_A,
      restaurantId: RESTAURANT_A,
      orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
      status: "pending",
    },
  ];
  const ensure = vi.fn(async (input: { restaurantId: number; orderId: number }) => {
    if (options?.ensureDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.ensureDelayMs));
    }
    return {
      id: 9000 + input.orderId,
      restaurantId: input.restaurantId,
      sessionId: null,
      outcome: "open" as const,
    };
  });
  const intake = new PosCheckIntakeService(
    grants,
    access,
    idempotency,
    async (orderId) => orders.find((row) => row.id === orderId) ?? null,
    ensure
  );
  return { store, grants, access, intake, ensure };
}

const command = {
  restaurantId: RESTAURANT_A,
  terminalId: TERMINAL_A,
  orderId: ORDER_A,
  idempotencyKey: "intake-key-01",
};

describe("POS Check Intake → existing Check Domain", () => {
  beforeEach(() => {
    vi.mocked(isPlatformOwner).mockReturnValue(false);
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: OWNER_A } as never;
      if (id === RESTAURANT_B) return { id, userId: OWNER_B } as never;
      return undefined as never;
    });
    mockLimit(2);
  });

  it("enrolls a cashier_pos Order into an open sessionless Check", async () => {
    const { store, grants, intake, ensure } = harness();
    await seedTerminal(store);
    await grantIntake(grants);
    const result = await intake.intake({ user: user(STAFF_A), command });
    expect(result).toMatchObject({
      checkId: 9000 + ORDER_A,
      orderId: ORDER_A,
      restaurantId: RESTAURANT_A,
      outcome: "open",
      sessionId: null,
      orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
      terminalId: TERMINAL_A,
      cashierUserId: STAFF_A,
      replayed: false,
    });
    expect(ensure).toHaveBeenCalledTimes(1);
    expect(ensure).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      orderId: ORDER_A,
    });
    expect(ensure.mock.calls[0][0]).not.toHaveProperty("grandTotal");
    expect(ensure.mock.calls[0][0]).not.toHaveProperty("sessionId");
  });

  it("denies POS_ACCESS without CHECK_INTAKE and CHECK_INTAKE without POS_ACCESS", async () => {
    const { store, grants, intake, ensure } = harness();
    await seedTerminal(store);
    await grantIntake(grants, STAFF_A, RESTAURANT_A, ["POS_ACCESS"]);
    await expect(intake.intake({ user: user(STAFF_A), command })).rejects.toMatchObject({
      code: "pos_permission_denied",
    });
    await grantIntake(grants, STAFF_A, RESTAURANT_A, ["CHECK_INTAKE"]);
    const onlyIntake = harness();
    await seedTerminal(onlyIntake.store);
    await grantIntake(onlyIntake.grants, STAFF_A, RESTAURANT_A, ["CHECK_INTAKE"]);
    await expect(
      onlyIntake.intake.intake({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    expect(ensure).not.toHaveBeenCalled();
    expect(onlyIntake.ensure).not.toHaveBeenCalled();
  });

  it("denies owner, admin, and PLATFORM_OWNER without POS grants", async () => {
    const { store, grants, intake, ensure } = harness();
    await seedTerminal(store);
    vi.mocked(isPlatformOwner).mockReturnValue(true);
    await expect(
      intake.intake({ user: user(OWNER_A), command })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      intake.intake({ user: user(ADMIN, "admin"), command })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      intake.intake({ user: user(PLATFORM), command })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(ensure).not.toHaveBeenCalled();
  });

  it("denies inactive, replaced, and foreign terminals", async () => {
    const { store, grants, intake, ensure } = harness();
    await seedTerminal(store, { lifecycle: "deactivated" });
    await grantIntake(grants);
    await expect(intake.intake({ user: user(STAFF_A), command })).rejects.toMatchObject({
      code: "terminal_inactive",
    });
    const replaced = harness();
    await seedTerminal(replaced.store, { lifecycle: "replaced" });
    await grantIntake(replaced.grants);
    await expect(
      replaced.intake.intake({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "terminal_inactive" });
    const foreign = harness();
    await seedTerminal(foreign.store, { restaurantId: RESTAURANT_B, id: TERMINAL_B });
    await grantIntake(foreign.grants);
    await expect(
      foreign.intake.intake({
        user: user(STAFF_A),
        command: { ...command, terminalId: TERMINAL_B },
      })
    ).rejects.toMatchObject({ code: "terminal_foreign" });
    expect(ensure).not.toHaveBeenCalled();
  });

  it("enforces restaurant isolation for user, terminal, and Order", async () => {
    const { store, grants, intake, ensure } = harness({
      orders: [
        {
          id: ORDER_A,
          restaurantId: RESTAURANT_B,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        },
      ],
    });
    await seedTerminal(store);
    await seedTerminal(store, { restaurantId: RESTAURANT_B, id: TERMINAL_B });
    await grantIntake(grants);
    await grantIntake(grants, STAFF_B, RESTAURANT_B);

    await expect(
      intake.intake({
        user: user(STAFF_A),
        command: { ...command, restaurantId: RESTAURANT_B, terminalId: TERMINAL_B },
      })
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(intake.intake({ user: user(STAFF_A), command })).rejects.toMatchObject({
      code: "order_wrong_restaurant",
    });

    await expect(
      intake.intake({ user: user(STAFF_B), command })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(ensure).not.toHaveBeenCalled();
  });

  it("rejects missing, non-POS, and cancelled Orders", async () => {
    const missing = harness({ orders: [] });
    await seedTerminal(missing.store);
    await grantIntake(missing.grants);
    await expect(
      missing.intake.intake({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "order_not_found" });

    const qr = harness({
      orders: [{ id: ORDER_A, restaurantId: RESTAURANT_A, orderingChannel: "qr" }],
    });
    await seedTerminal(qr.store);
    await grantIntake(qr.grants);
    await expect(qr.intake.intake({ user: user(STAFF_A), command })).rejects.toMatchObject({
      code: "order_not_eligible",
    });

    const cancelled = harness({
      orders: [
        {
          id: ORDER_A,
          restaurantId: RESTAURANT_A,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
          status: "cancelled",
        },
      ],
    });
    await seedTerminal(cancelled.store);
    await grantIntake(cancelled.grants);
    await expect(
      cancelled.intake.intake({ user: user(STAFF_A), command })
    ).rejects.toMatchObject({ code: "order_not_eligible" });
  });

  it("maps a terminal Check enrollment to order_not_eligible", async () => {
    const { store, grants, intake, ensure } = harness();
    await seedTerminal(store);
    await grantIntake(grants);
    ensure.mockRejectedValueOnce(
      new CheckMembershipError("Order already enrolled on paid Check 9")
    );
    await expect(intake.intake({ user: user(STAFF_A), command })).rejects.toMatchObject({
      code: "order_not_eligible",
    });
  });

  it("ignores client cashier, totals, and channel and derives them server-side", async () => {
    const { store, grants, intake, ensure } = harness();
    await seedTerminal(store);
    await grantIntake(grants);
    const result = await intake.intake({
      user: user(STAFF_A),
      command: {
        ...command,
        cashierId: 9999,
        userId: 9999,
        channel: "qr",
        grandTotal: "999.00",
        subtotal: "1.00",
      } as typeof command,
    });
    expect(result.cashierUserId).toBe(STAFF_A);
    expect(result.orderingChannel).toBe(ORDERING_CHANNEL_CASHIER_POS);
    expect(result.outcome).toBe("open");
    expect(ensure).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      orderId: ORDER_A,
    });
  });

  it("replays the same Check for the same idempotency key", async () => {
    const { store, grants, intake, ensure } = harness();
    await seedTerminal(store);
    await grantIntake(grants);
    const first = await intake.intake({ user: user(STAFF_A), command });
    const second = await intake.intake({ user: user(STAFF_A), command });
    expect(second.checkId).toBe(first.checkId);
    expect(second.replayed).toBe(true);
    expect(second.outcome).toBe("open");
    expect(ensure).toHaveBeenCalledTimes(1);
  });

  it("allows a different key for the same Order and still uses one Check ensure", async () => {
    const { store, grants, intake, ensure } = harness();
    await seedTerminal(store);
    await grantIntake(grants);
    const first = await intake.intake({ user: user(STAFF_A), command });
    const second = await intake.intake({
      user: user(STAFF_A),
      command: { ...command, idempotencyKey: "intake-key-02" },
    });
    expect(second.checkId).toBe(first.checkId);
    expect(ensure).toHaveBeenCalledTimes(2);
  });

  it("returns an idempotency conflict when the same key is reused for a different Order", async () => {
    const { store, grants, intake } = harness({
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
    await grantIntake(grants);
    await intake.intake({ user: user(STAFF_A), command });
    await expect(
      intake.intake({
        user: user(STAFF_A),
        command: { ...command, orderId: 402 },
      })
    ).rejects.toBeInstanceOf(PosCheckIntakeError);
    await expect(
      intake.intake({
        user: user(STAFF_A),
        command: { ...command, orderId: 402 },
      })
    ).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("collapses concurrent duplicate requests to one Check ensure", async () => {
    const { store, grants, intake, ensure } = harness({ ensureDelayMs: 20 });
    await seedTerminal(store);
    await grantIntake(grants);
    const [first, second] = await Promise.all([
      intake.intake({ user: user(STAFF_A), command }),
      intake.intake({ user: user(STAFF_A), command }),
    ]);
    expect(first.checkId).toBe(second.checkId);
    expect([first.replayed, second.replayed].filter(Boolean)).toHaveLength(1);
    expect(ensure).toHaveBeenCalledTimes(1);
  });

  it("emits pos_check_intake duration telemetry without financial amounts", async () => {
    vi.mocked(opsLog).mockClear();
    const { store, grants, intake } = harness();
    await seedTerminal(store);
    await grantIntake(grants);
    await intake.intake({ user: user(STAFF_A), command });
    const event = vi.mocked(opsLog).mock.calls
      .map((call) => call[0])
      .find((row) => row?.type === "pos_check_intake");
    expect(event).toBeDefined();
    expect(event?.metadata).toEqual(
      expect.objectContaining({
        orderId: ORDER_A,
        checkId: 9000 + ORDER_A,
        terminalId: TERMINAL_A,
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        durationMs: expect.any(Number),
        startedAt: expect.any(String),
        completedAt: expect.any(String),
        authMs: expect.any(Number),
        orderLoadMs: expect.any(Number),
        checkEnsureMs: expect.any(Number),
      })
    );
    expect((event?.metadata?.durationMs as number) >= 0).toBe(true);
    expect(event?.metadata).not.toHaveProperty("grandTotal");
    expect(event?.metadata).not.toHaveProperty("taxAmount");
    expect(event?.metadata).not.toHaveProperty("subtotal");
  });
});
