/**
 * POS-CASHIER-CRMP-OPERATIONS-1 — POS adapter → existing CRMP operations.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import {
  PosCashierCrmpError,
  PosCashierCrmpOperationsService,
} from "../services/PosCashierCrmpOperationsService";
import { createInMemoryCrmpStore } from "../../crmp/InMemoryCrmpStore";
import { RegisterDomainService } from "../../crmp/RegisterDomainService";
import { setCrmpApiUnitOfWorkForTests } from "../../crmp/api/crmpApiComposition";
import type { SelectUser } from "../../../drizzle/schema";
import type { PosPermission } from "@shared/pos";

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
const ADMIN = 3;
const PLATFORM = 500;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";
const TERMINAL_B = "66666666-6666-4666-8666-666666666666";
const REGISTER_A = "reg_1_front";
const REGISTER_B = "reg_2_other";

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
    id: string;
    optionalDeviceId: string | null;
  }>
) {
  await store.insert({
    id: overrides?.id ?? TERMINAL_A,
    restaurantId: overrides?.restaurantId ?? RESTAURANT_A,
    code: overrides?.id === TERMINAL_B ? "POS-B01" : "POS-001",
    lifecycle: "active",
    replacedByTerminalId: null,
    optionalDeviceId: overrides?.optionalDeviceId ?? null,
    version: 1,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
}

async function grant(
  grants: InMemoryPosPermissionGrantStore,
  permissions: PosPermission[],
  userId = STAFF_A,
  restaurantId = RESTAURANT_A
) {
  for (const permission of permissions) {
    await grants.upsert({ userId, restaurantId, permission });
  }
}

async function provisionRegister(
  registers: RegisterDomainService,
  restaurantId: number,
  registerId: string
) {
  await registers.provision({
    restaurantId,
    code: registerId,
    displayName: registerId,
    registerType: "counter",
    registerId,
    at: "t0",
  });
  await registers.activate({ restaurantId, registerId, at: "t1" });
}

function harness() {
  const store = new InMemoryPosTerminalStore();
  const grants = new InMemoryPosPermissionGrantStore();
  const uow = createInMemoryCrmpStore();
  setCrmpApiUnitOfWorkForTests(uow);
  const registers = new RegisterDomainService(uow);
  const access = new PosAccessService(
    store,
    grants,
    new PosEntitlementService(store)
  );
  const cashier = new PosCashierCrmpOperationsService(grants, access, store);
  return { store, grants, access, cashier, registers, uow };
}

const openRegisterCommand = {
  restaurantId: RESTAURANT_A,
  terminalId: TERMINAL_A,
  registerId: REGISTER_A,
};

describe("POS cashier CRMP operations", () => {
  beforeEach(() => {
    vi.mocked(isPlatformOwner).mockReturnValue(false);
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: OWNER_A } as never;
      if (id === RESTAURANT_B) return { id, userId: OWNER_B } as never;
      return undefined as never;
    });
    mockLimit(2);
  });

  afterEach(() => {
    setCrmpApiUnitOfWorkForTests(null);
  });

  it("lets an authorized cashier open and close a CRMP Register", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS", "SHIFT_OPEN", "SHIFT_CLOSE"]);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);

    const opened = await cashier.openRegister({
      user: user(STAFF_A),
      command: openRegisterCommand,
    });
    expect(opened.register.dutyStatus).toBe("open");
    expect(opened.register.assignedOperatorUserId).toBe(STAFF_A);
    expect(opened.cashierUserId).toBe(STAFF_A);
    expect(opened.alreadyApplied).toBe(false);

    const replay = await cashier.openRegister({
      user: user(STAFF_A),
      command: openRegisterCommand,
    });
    expect(replay.alreadyApplied).toBe(true);

    const closed = await cashier.closeRegister({
      user: user(STAFF_A),
      command: openRegisterCommand,
    });
    expect(closed.register.dutyStatus).toBe("closed");
    expect(closed.register.assignedOperatorUserId).toBeNull();
  });

  it("denies POS_ACCESS without SHIFT_OPEN and owner/admin/PLATFORM_OWNER without grants", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS"]);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await expect(
      cashier.openRegister({ user: user(STAFF_A), command: openRegisterCommand })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });

    const privileged = harness();
    await seedTerminal(privileged.store);
    await provisionRegister(privileged.registers, RESTAURANT_A, REGISTER_A);
    vi.mocked(isPlatformOwner).mockReturnValue(true);
    await expect(
      privileged.cashier.openRegister({
        user: user(OWNER_A),
        command: openRegisterCommand,
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      privileged.cashier.openRegister({
        user: user(ADMIN, "admin"),
        command: openRegisterCommand,
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      privileged.cashier.openRegister({
        user: user(PLATFORM),
        command: openRegisterCommand,
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("opens a Financial Shift with server cashier identity and retries idempotently", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS", "SHIFT_OPEN", "SHIFT_CLOSE"]);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await cashier.openRegister({
      user: user(STAFF_A),
      command: openRegisterCommand,
    });

    const opened = await cashier.openShift({
      user: user(STAFF_A),
      command: {
        ...openRegisterCommand,
        openingFloatAmount: "100.00",
        currencyCode: "SAR",
        idempotencyKey: "shift-open-01",
        operatorUserId: 9999,
        cashierId: 9999,
      } as typeof openRegisterCommand & {
        openingFloatAmount: string;
        currencyCode: string;
        idempotencyKey: string;
      },
    });
    expect(opened.shift.operatorUserId).toBe(STAFF_A);
    expect(opened.shift.registerId).toBe(REGISTER_A);
    expect(opened.alreadyApplied).toBe(false);

    const replay = await cashier.openShift({
      user: user(STAFF_A),
      command: {
        ...openRegisterCommand,
        openingFloatAmount: "100.00",
        currencyCode: "SAR",
        idempotencyKey: "shift-open-01",
      },
    });
    expect(replay.shift.financialShiftId).toBe(opened.shift.financialShiftId);
    expect(replay.alreadyApplied).toBe(true);
    expect(replay.cashierUserId).toBe(STAFF_A);
  });

  it("closes the active Financial Shift without trusting client shift identity", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS", "SHIFT_OPEN", "SHIFT_CLOSE"]);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await cashier.openRegister({
      user: user(STAFF_A),
      command: openRegisterCommand,
    });
    const opened = await cashier.openShift({
      user: user(STAFF_A),
      command: {
        ...openRegisterCommand,
        openingFloatAmount: "50.00",
        currencyCode: "SAR",
        idempotencyKey: "shift-open-02",
      },
    });
    await expect(
      cashier.closeShift({
        user: user(STAFF_A),
        command: {
          ...openRegisterCommand,
          actualCashAmount: "50.00",
          financialShiftId: "fs_forged",
        },
      })
    ).rejects.toMatchObject({ code: "shift_mismatch" });

    const closed = await cashier.closeShift({
      user: user(STAFF_A),
      command: {
        ...openRegisterCommand,
        actualCashAmount: "50.00",
      },
    });
    expect(closed.shift.financialShiftId).toBe(opened.shift.financialShiftId);
    expect(closed.shift.status).toBe("closed");
  });

  it("rejects a closed Register when opening a Shift and a missing Shift when closing", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS", "SHIFT_OPEN", "SHIFT_CLOSE"]);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await expect(
      cashier.openShift({
        user: user(STAFF_A),
        command: {
          ...openRegisterCommand,
          openingFloatAmount: "10.00",
          currencyCode: "SAR",
          idempotencyKey: "shift-open-03",
        },
      })
    ).rejects.toBeInstanceOf(Error);

    await expect(
      cashier.closeShift({
        user: user(STAFF_A),
        command: { ...openRegisterCommand, actualCashAmount: "10.00" },
      })
    ).rejects.toMatchObject({ code: "shift_required" });
  });

  it("rejects cross-restaurant Register and terminal/register mismatch", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await seedTerminal(store, { restaurantId: RESTAURANT_B, id: TERMINAL_B });
    await grant(grants, ["POS_ACCESS", "SHIFT_OPEN"]);
    await grant(grants, ["POS_ACCESS", "SHIFT_OPEN"], STAFF_A, RESTAURANT_B);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await provisionRegister(registers, RESTAURANT_B, REGISTER_B);

    await expect(
      cashier.openRegister({
        user: user(STAFF_A),
        command: { ...openRegisterCommand, registerId: REGISTER_B },
      })
    ).rejects.toBeInstanceOf(PosCashierCrmpError);

    const bound = harness();
    await seedTerminal(bound.store, { optionalDeviceId: "dev-a" });
    await grant(bound.grants, ["POS_ACCESS", "SHIFT_OPEN"]);
    await provisionRegister(bound.registers, RESTAURANT_A, REGISTER_A);
    await bound.registers.attachDevice({
      restaurantId: RESTAURANT_A,
      registerId: REGISTER_A,
      deviceId: "dev-other",
      at: "t2",
    });
    await expect(
      bound.cashier.openRegister({
        user: user(STAFF_A),
        command: openRegisterCommand,
      })
    ).rejects.toMatchObject({ code: "register_terminal_mismatch" });
  });

  it("ignores client cashier identity extras", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS", "SHIFT_OPEN"]);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    const opened = await cashier.openRegister({
      user: user(STAFF_A),
      command: {
        ...openRegisterCommand,
        cashierId: 9999,
        operatorUserId: 9999,
        userId: 9999,
      } as typeof openRegisterCommand,
    });
    expect(opened.cashierUserId).toBe(STAFF_A);
    expect(opened.register.assignedOperatorUserId).toBe(STAFF_A);
  });
});
