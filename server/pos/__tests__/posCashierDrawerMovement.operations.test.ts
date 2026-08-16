/**
 * POS-CASHIER-DRAWER-MOVEMENT-1 — POS adapter → CRMP recordDrawerMovement.
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
import { isPlatformOwner } from "../../platform-owner-access/identity";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";

const RESTAURANT_A = 1;
const RESTAURANT_B = 2;
const OWNER_A = 10;
const OWNER_B = 20;
const STAFF_A = 7;
const ADMIN = 3;
const PLATFORM = 500;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";
const TERMINAL_B = "66666666-6666-4666-8666-666666666666";
const FORGED_TERMINAL = "99999999-9999-4999-8999-999999999999";
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

const baseCommand = {
  restaurantId: RESTAURANT_A,
  terminalId: TERMINAL_A,
  registerId: REGISTER_A,
};

const SETUP_PERMS: PosPermission[] = ["POS_ACCESS", "SHIFT_OPEN", "SHIFT_CLOSE"];
const MOVE_PERMS: PosPermission[] = [
  "POS_ACCESS",
  "SHIFT_OPEN",
  "SHIFT_CLOSE",
  "REGISTER_ADJUST",
];

async function openDutyAndShift(
  cashier: PosCashierCrmpOperationsService,
  registerId = REGISTER_A
) {
  await cashier.openRegister({
    user: user(STAFF_A),
    command: { ...baseCommand, registerId },
  });
  return cashier.openShift({
    user: user(STAFF_A),
    command: {
      ...baseCommand,
      registerId,
      openingFloatAmount: "100.00",
      currencyCode: "SAR",
      idempotencyKey: `shift-open-${registerId}`,
    },
  });
}

describe("POS cashier drawer movement", () => {
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

  it("lets an authorized POS cashier record a CRMP drawer movement", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, MOVE_PERMS);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await openDutyAndShift(cashier);

    const result = await cashier.recordDrawerMovement({
      user: user(STAFF_A),
      command: {
        ...baseCommand,
        movementType: "paid_in",
        amount: "15.00",
        reason: "change bag",
        idempotencyKey: "pos-move-1",
      },
    });
    expect(result.alreadyApplied).toBe(false);
    expect(result.movement.movementType).toBe("paid_in");
    expect(result.movement.amount).toBe("15.00");
    expect(result.movement.actorUserId).toBe(STAFF_A);
    expect(result.shift.expectedCashAmount).toBe("115.00");
    expect(result.cashierUserId).toBe(STAFF_A);
    expect(result.terminalId).toBe(TERMINAL_A);
  });

  it("denies missing POS_ACCESS, missing REGISTER_ADJUST, and privileged roles without grants", async () => {
    const missingAccess = harness();
    await seedTerminal(missingAccess.store);
    await grant(missingAccess.grants, ["REGISTER_ADJUST"]);
    await provisionRegister(missingAccess.registers, RESTAURANT_A, REGISTER_A);
    await expect(
      missingAccess.cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          movementType: "paid_in",
          amount: "1.00",
          reason: "x",
          idempotencyKey: "no-access",
        },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });

    const missingAdjust = harness();
    await seedTerminal(missingAdjust.store);
    await grant(missingAdjust.grants, SETUP_PERMS);
    await provisionRegister(missingAdjust.registers, RESTAURANT_A, REGISTER_A);
    await openDutyAndShift(missingAdjust.cashier);
    await expect(
      missingAdjust.cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          movementType: "paid_in",
          amount: "1.00",
          reason: "x",
          idempotencyKey: "no-adjust",
        },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });

    const privileged = harness();
    await seedTerminal(privileged.store);
    await provisionRegister(privileged.registers, RESTAURANT_A, REGISTER_A);
    vi.mocked(isPlatformOwner).mockReturnValue(true);
    const deniedCommand = {
      ...baseCommand,
      movementType: "paid_in" as const,
      amount: "1.00",
      reason: "x",
      idempotencyKey: "privileged",
    };
    await expect(
      privileged.cashier.recordDrawerMovement({
        user: user(OWNER_A),
        command: deniedCommand,
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      privileged.cashier.recordDrawerMovement({
        user: user(ADMIN, "admin"),
        command: deniedCommand,
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      privileged.cashier.recordDrawerMovement({
        user: user(PLATFORM),
        command: deniedCommand,
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("rejects unauthenticated callers at the POS router", async () => {
    const anon = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      anon.pos.cashier.financialShift.recordDrawerMovement({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        registerId: REGISTER_A,
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        idempotencyKey: "anon-key-1",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects forged restaurant ids and cross-restaurant Register/Terminal", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await seedTerminal(store, { restaurantId: RESTAURANT_B, id: TERMINAL_B });
    await grant(grants, MOVE_PERMS);
    await grant(grants, MOVE_PERMS, STAFF_A, RESTAURANT_B);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await provisionRegister(registers, RESTAURANT_B, REGISTER_B);
    await openDutyAndShift(cashier);

    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          restaurantId: 999,
          movementType: "paid_in",
          amount: "1.00",
          reason: "forged restaurant",
          idempotencyKey: "forged-rest",
        },
      })
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          registerId: REGISTER_B,
          movementType: "paid_in",
          amount: "1.00",
          reason: "cross register",
          idempotencyKey: "cross-reg",
        },
      })
    ).rejects.toBeInstanceOf(PosCashierCrmpError);

    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          restaurantId: RESTAURANT_B,
          terminalId: TERMINAL_A,
          registerId: REGISTER_B,
          movementType: "paid_in",
          amount: "1.00",
          reason: "wrong terminal restaurant",
          idempotencyKey: "cross-term",
        },
      })
    ).rejects.toMatchObject({ code: "terminal_foreign" });
  });

  it("stamps authenticated cashier identity and ignores forged cashier/operator ids", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, MOVE_PERMS);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await openDutyAndShift(cashier);

    const result = await cashier.recordDrawerMovement({
      user: user(STAFF_A),
      command: {
        ...baseCommand,
        movementType: "paid_out",
        amount: "10.00",
        reason: "petty cash",
        idempotencyKey: "pos-move-actor",
        cashierId: 9999,
        operatorUserId: 8888,
        userId: 7777,
        actorUserId: 6666,
      } as typeof baseCommand & {
        movementType: "paid_out";
        amount: string;
        reason: string;
        idempotencyKey: string;
      },
    });
    expect(result.movement.actorUserId).toBe(STAFF_A);
    expect(result.cashierUserId).toBe(STAFF_A);
    expect(result.shift.operatorUserId).toBe(STAFF_A);
  });

  it("rejects closed Register, closed Shift, wrong Register, and Shift mismatch", async () => {
    const closedRegister = harness();
    await seedTerminal(closedRegister.store);
    await grant(closedRegister.grants, MOVE_PERMS);
    await provisionRegister(closedRegister.registers, RESTAURANT_A, REGISTER_A);
    await closedRegister.cashier.openRegister({
      user: user(STAFF_A),
      command: baseCommand,
    });
    await closedRegister.cashier.closeRegister({
      user: user(STAFF_A),
      command: baseCommand,
    });
    await expect(
      closedRegister.cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          movementType: "paid_in",
          amount: "1.00",
          reason: "closed register",
          idempotencyKey: "closed-reg",
        },
      })
    ).rejects.toMatchObject({ code: "shift_required" });

    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, MOVE_PERMS);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await provisionRegister(registers, RESTAURANT_A, "reg_wrong");
    await openDutyAndShift(cashier);

    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          registerId: "reg_wrong",
          movementType: "paid_in",
          amount: "1.00",
          reason: "wrong register",
          idempotencyKey: "wrong-reg",
        },
      })
    ).rejects.toMatchObject({ code: "shift_required" });

    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          financialShiftId: "fs_forged",
          movementType: "paid_in",
          amount: "1.00",
          reason: "wrong shift",
          idempotencyKey: "wrong-shift",
        },
      })
    ).rejects.toMatchObject({ code: "shift_mismatch" });

    await cashier.closeShift({
      user: user(STAFF_A),
      command: { ...baseCommand, actualCashAmount: "100.00" },
    });
    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          movementType: "paid_in",
          amount: "1.00",
          reason: "after close",
          idempotencyKey: "closed-shift",
        },
      })
    ).rejects.toMatchObject({ code: "shift_required" });
  });

  it("rejects forged and foreign POS Terminals", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await seedTerminal(store, { restaurantId: RESTAURANT_B, id: TERMINAL_B });
    await grant(grants, MOVE_PERMS);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await openDutyAndShift(cashier);

    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          terminalId: FORGED_TERMINAL,
          movementType: "paid_in",
          amount: "1.00",
          reason: "forged terminal",
          idempotencyKey: "forged-term",
        },
      })
    ).rejects.toMatchObject({ code: "terminal_not_found" });

    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          terminalId: TERMINAL_B,
          movementType: "paid_in",
          amount: "1.00",
          reason: "foreign terminal",
          idempotencyKey: "foreign-term",
        },
      })
    ).rejects.toMatchObject({ code: "terminal_foreign" });
  });

  it("forwards CRMP idempotency: first request, exact retry, conflict, concurrent duplicate", async () => {
    const { store, grants, cashier, registers } = harness();
    await seedTerminal(store);
    await grant(grants, MOVE_PERMS);
    await provisionRegister(registers, RESTAURANT_A, REGISTER_A);
    await openDutyAndShift(cashier);

    const first = await cashier.recordDrawerMovement({
      user: user(STAFF_A),
      command: {
        ...baseCommand,
        movementType: "paid_out",
        amount: "10.00",
        reason: "petty cash",
        idempotencyKey: "pos-idem-1",
      },
    });
    expect(first.alreadyApplied).toBe(false);

    const replay = await cashier.recordDrawerMovement({
      user: user(STAFF_A),
      command: {
        ...baseCommand,
        movementType: "paid_out",
        amount: "10.00",
        reason: "petty cash",
        idempotencyKey: "pos-idem-1",
      },
    });
    expect(replay.alreadyApplied).toBe(true);
    expect(replay.movement.movementId).toBe(first.movement.movementId);
    expect(replay.shift.expectedCashAmount).toBe(first.shift.expectedCashAmount);

    await expect(
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          movementType: "paid_out",
          amount: "20.00",
          reason: "petty cash",
          idempotencyKey: "pos-idem-1",
        },
      })
    ).rejects.toMatchObject({ code: "idempotency_conflict" });

    const [a, b] = await Promise.all([
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          movementType: "paid_in",
          amount: "3.00",
          reason: "a",
          idempotencyKey: "pos-concurrent",
        },
      }),
      cashier.recordDrawerMovement({
        user: user(STAFF_A),
        command: {
          ...baseCommand,
          movementType: "paid_in",
          amount: "3.00",
          reason: "a",
          idempotencyKey: "pos-concurrent",
        },
      }),
    ]);
    expect(a.movement.movementId).toBe(b.movement.movementId);
    expect(a.alreadyApplied && b.alreadyApplied).toBe(false);
  });
});
