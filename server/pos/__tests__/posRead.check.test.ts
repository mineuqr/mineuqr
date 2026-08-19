/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1 — POS Check read by Order.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosCheckReadService } from "../services/PosCheckReadService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { computeCheckMoney } from "@shared/operational-session";
import type { SelectUser } from "../../../drizzle/schema";
import type { PosPermission } from "@shared/pos";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
  getOrderById: vi.fn(),
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
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
import {
  setPosGrantStoreForTests,
  setPosStoreForTests,
} from "../posComposition";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";
import { opsLog } from "../../_core/opsLog";

const RESTAURANT_A = 1;
const RESTAURANT_B = 2;
const OWNER_A = 10;
const STAFF_A = 7;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";
const TERMINAL_B = "66666666-6666-4666-8666-666666666666";

function user(id: number, role: SelectUser["role"] = "user"): SelectUser {
  return { id, role } as SelectUser;
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

async function seedTerminal(
  store: InMemoryPosTerminalStore,
  overrides?: { restaurantId?: number; id?: string }
) {
  await store.insert({
    id: overrides?.id ?? TERMINAL_A,
    restaurantId: overrides?.restaurantId ?? RESTAURANT_A,
    code: "POS-001",
    lifecycle: "active",
    replacedByTerminalId: null,
    optionalDeviceId: null,
    version: 1,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
}

async function grant(
  grants: InMemoryPosPermissionGrantStore,
  permissions: PosPermission[] = ["POS_ACCESS"]
) {
  for (const permission of permissions) {
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission,
    });
  }
}

function service(args: {
  grants: InMemoryPosPermissionGrantStore;
  store: InMemoryPosTerminalStore;
  order?: { id: number; restaurantId: number } | null;
  membership?: { checkId: number; checkOutcome: string } | null;
  check?: {
    id: number;
    restaurantId: number;
    outcome: string;
    grandTotal: string;
    subtotal: string;
    taxAmount: string;
    billDiscountAmount?: string;
  } | null;
}) {
  return new PosCheckReadService(
    args.grants,
    new PosAccessService(
      args.store,
      args.grants,
      new PosEntitlementService(args.store)
    ),
    async () => args.order ?? null,
    async () => args.membership ?? null,
    async () =>
      args.check
        ? {
            ...args.check,
            billDiscountAmount: args.check.billDiscountAmount ?? "0.00",
          }
        : null
  );
}

describe("POS Check read by Order", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id: RESTAURANT_A, userId: OWNER_A };
      if (id === RESTAURANT_B) return { id: RESTAURANT_B, userId: 20 };
      return undefined;
    });
    mockLimit();
  });

  afterEach(() => {
    setPosStoreForTests(null);
    setPosGrantStoreForTests(null);
  });

  it("returns Check.grandTotal for an open Check on the authorized restaurant", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants);
    const result = await service({
      grants,
      store,
      order: { id: 55, restaurantId: RESTAURANT_A },
      membership: { checkId: 9, checkOutcome: "open" },
      check: {
        id: 9,
        restaurantId: RESTAURANT_A,
        outcome: "open",
        grandTotal: "11.50",
        subtotal: "10.00",
        taxAmount: "1.50",
        billDiscountAmount: "0.00",
      },
    }).getByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    expect(result).toEqual({
      checkId: 9,
      orderId: 55,
      restaurantId: RESTAURANT_A,
      outcome: "open",
      grandTotal: "11.50",
      subtotal: "10.00",
      taxAmount: "1.50",
      billDiscountAmount: "0.00",
    });
  });

  it("returns null when membership is missing (Check not yet intake)", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants);
    const result = await service({
      grants,
      store,
      order: { id: 55, restaurantId: RESTAURANT_A },
      membership: null,
      check: null,
    }).getByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    expect(result).toBeNull();
  });

  it("returns not_found when membership exists but Check is missing", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants);
    await expect(
      service({
        grants,
        store,
        order: { id: 55, restaurantId: RESTAURANT_A },
        membership: { checkId: 9, checkOutcome: "open" },
        check: null,
      }).getByOrder({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          orderId: 55,
        },
      })
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("returns a paid Check without treating it as a missing Check", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants);
    const result = await service({
      grants,
      store,
      order: { id: 55, restaurantId: RESTAURANT_A },
      membership: { checkId: 9, checkOutcome: "paid" },
      check: {
        id: 9,
        restaurantId: RESTAURANT_A,
        outcome: "paid",
        grandTotal: "11.50",
        subtotal: "10.00",
        taxAmount: "1.50",
      },
    }).getByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    expect(result?.outcome).toBe("paid");
    expect(result?.grandTotal).toBe("11.50");
  });

  it("does not compute payable money; exclusive tax remains Check-owned", async () => {
    const money = computeCheckMoney({
      chargesSubtotal: "10.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: {
        version: 1,
        enabled: true,
        mode: "exclusive",
        components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
      },
    });
    expect(money.grandTotal).toBe("11.50");
    expect(money.grandTotal).not.toBe("10.00");
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants);
    const result = await service({
      grants,
      store,
      order: { id: 55, restaurantId: RESTAURANT_A },
      membership: { checkId: 9, checkOutcome: "open" },
      check: {
        id: 9,
        restaurantId: RESTAURANT_A,
        outcome: "open",
        grandTotal: money.grandTotal,
        subtotal: money.subtotal,
        taxAmount: money.taxAmount,
      },
    }).getByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    expect(result?.grandTotal).toBe("11.50");
    expect(result?.grandTotal).not.toBe("10.00");
    expect(result?.billDiscountAmount).toBe("0.00");
  });

  it("copies billDiscountAmount from Check without calculating discount", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants);
    const result = await service({
      grants,
      store,
      order: { id: 55, restaurantId: RESTAURANT_A },
      membership: { checkId: 9, checkOutcome: "open" },
      check: {
        id: 9,
        restaurantId: RESTAURANT_A,
        outcome: "open",
        grandTotal: "11.50",
        subtotal: "10.00",
        taxAmount: "1.50",
        billDiscountAmount: "2.00",
      },
    }).getByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    expect(result?.billDiscountAmount).toBe("2.00");
    expect(result?.grandTotal).toBe("11.50");
  });

  it("denies owner without POS_ACCESS", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await expect(
      service({
        grants,
        store,
        order: { id: 55, restaurantId: RESTAURANT_A },
      }).getByOrder({
        user: user(OWNER_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          orderId: 55,
        },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
  });

  it("denies a grant holder on restaurant A from reading restaurant B", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await seedTerminal(store, { id: TERMINAL_B, restaurantId: RESTAURANT_B });
    await grant(grants);
    await expect(
      service({
        grants,
        store,
        order: { id: 55, restaurantId: RESTAURANT_B },
      }).getByOrder({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_B,
          terminalId: TERMINAL_B,
          orderId: 55,
        },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("maps missing POS grant to FORBIDDEN at the router", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    setPosStoreForTests(store);
    setPosGrantStoreForTests(grants);
    const caller = appRouter.createCaller({
      user: user(STAFF_A),
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.pos.read.check.getByOrder({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      })
    ).rejects.toBeInstanceOf(TRPCError);
    await expect(
      caller.pos.read.check.getByOrder({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not leak a foreign restaurant Order", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants);
    await expect(
      service({
        grants,
        store,
        order: { id: 55, restaurantId: RESTAURANT_B },
        membership: { checkId: 9, checkOutcome: "open" },
        check: {
          id: 9,
          restaurantId: RESTAURANT_B,
          outcome: "open",
          grandTotal: "11.50",
          subtotal: "10.00",
          taxAmount: "1.50",
        },
      }).getByOrder({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          orderId: 55,
        },
      })
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rejects unauthenticated router callers", async () => {
    const anon = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      anon.pos.read.check.getByOrder({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("emits pos_check_read duration and resultState without financial amounts", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants);
    vi.mocked(opsLog).mockClear();
    await service({
      grants,
      store,
      order: { id: 55, restaurantId: RESTAURANT_A },
      membership: { checkId: 9, checkOutcome: "open" },
      check: {
        id: 9,
        restaurantId: RESTAURANT_A,
        outcome: "open",
        grandTotal: "11.50",
        subtotal: "10.00",
        taxAmount: "1.50",
      },
    }).getByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    const available = vi.mocked(opsLog).mock.calls
      .map((call) => call[0])
      .find((row) => row?.type === "pos_check_read");
    expect(available?.metadata).toEqual(
      expect.objectContaining({
        resultState: "check_available",
        durationMs: expect.any(Number),
        startedAt: expect.any(String),
        completedAt: expect.any(String),
        orderId: 55,
        checkId: 9,
        terminalId: TERMINAL_A,
      })
    );
    expect(available?.metadata).not.toHaveProperty("grandTotal");
    expect(available?.metadata).not.toHaveProperty("taxAmount");
    expect(available?.metadata).not.toHaveProperty("subtotal");

    vi.mocked(opsLog).mockClear();
    await service({
      grants,
      store,
      order: { id: 55, restaurantId: RESTAURANT_A },
      membership: null,
      check: null,
    }).getByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    expect(
      vi.mocked(opsLog).mock.calls.map((call) => call[0]?.metadata?.resultState)
    ).toContain("no_membership");

    vi.mocked(opsLog).mockClear();
    await expect(
      service({
        grants,
        store,
        order: { id: 55, restaurantId: RESTAURANT_A },
        membership: { checkId: 9, checkOutcome: "open" },
        check: null,
      }).getByOrder({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          orderId: 55,
        },
      })
    ).rejects.toMatchObject({ code: "not_found" });
    expect(
      vi.mocked(opsLog).mock.calls.map((call) => call[0]?.metadata?.resultState)
    ).toContain("check_not_found");

    vi.mocked(opsLog).mockClear();
    await service({
      grants,
      store,
      order: { id: 55, restaurantId: RESTAURANT_A },
      membership: { checkId: 9, checkOutcome: "paid" },
      check: {
        id: 9,
        restaurantId: RESTAURANT_A,
        outcome: "paid",
        grandTotal: "11.50",
        subtotal: "10.00",
        taxAmount: "1.50",
      },
    }).getByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    expect(
      vi.mocked(opsLog).mock.calls.map((call) => call[0]?.metadata?.resultState)
    ).toContain("terminal_check");
  });
});
