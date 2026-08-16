/**
 * CRMP-DRAWER-MOVEMENT-API-1 — public drawer movement command.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../../../_core/context";
import { createInMemoryCrmpStore } from "../../InMemoryCrmpStore";
import { RegisterDomainService } from "../../RegisterDomainService";
import { setCrmpApiUnitOfWorkForTests } from "../crmpApiComposition";

vi.mock("../../../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

import { assertRestaurantAccess } from "../../../restaurantAccess";
import { appRouter } from "../../../routers";

function createVerifiedCaller(userId = 1) {
  return appRouter.createCaller({
    user: {
      id: userId,
      openId: `owner-${userId}`,
      role: "user",
      emailVerifiedAt: new Date(),
    } as TrpcContext["user"],
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

async function openDutyAndShift(caller: ReturnType<typeof createVerifiedCaller>) {
  await caller.crmp.register.open({
    restaurantId: 42,
    registerId: "reg_1",
    operatorUserId: 7,
    at: "t2",
  });
  await caller.crmp.financialShift.open({
    restaurantId: 42,
    registerId: "reg_1",
    operatorUserId: 7,
    openingFloatAmount: "100.00",
    currencyCode: "SAR",
    financialShiftId: "fsh_api_1",
    at: "t3",
  });
}

describe("crmp.financialShift.recordDrawerMovement", () => {
  let registers: RegisterDomainService;

  beforeEach(async () => {
    vi.mocked(assertRestaurantAccess).mockReset();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    const uow = createInMemoryCrmpStore();
    setCrmpApiUnitOfWorkForTests(uow);
    registers = new RegisterDomainService(uow);
    await registers.provision({
      restaurantId: 42,
      code: "C1",
      displayName: "Counter 1",
      registerType: "counter",
      registerId: "reg_1",
      at: "t0",
    });
    await registers.activate({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t1",
    });
    await registers.provision({
      restaurantId: 99,
      code: "C2",
      displayName: "Other",
      registerType: "counter",
      registerId: "reg_other",
      at: "t0",
    });
    await registers.activate({
      restaurantId: 99,
      registerId: "reg_other",
      at: "t1",
    });
  });

  afterEach(() => {
    setCrmpApiUnitOfWorkForTests(null);
  });

  it("records paid_in with authenticated actor and updates expected cash", async () => {
    const caller = createVerifiedCaller(11);
    await openDutyAndShift(caller);
    const result = await caller.crmp.financialShift.recordDrawerMovement({
      restaurantId: 42,
      registerId: "reg_1",
      movementType: "paid_in",
      amount: "15.00",
      reason: "change bag",
      idempotencyKey: "key-1",
      at: "t4",
    });
    expect(result.alreadyApplied).toBe(false);
    expect(result.movement.movementType).toBe("paid_in");
    expect(result.movement.amount).toBe("15.00");
    expect(result.movement.actorUserId).toBe(11);
    expect(result.shift.expectedCashAmount).toBe("115.00");
    expect(result).not.toHaveProperty("drawer");
  });

  it("replays an identical idempotency key and rejects a conflicting payload", async () => {
    const caller = createVerifiedCaller();
    await openDutyAndShift(caller);
    const first = await caller.crmp.financialShift.recordDrawerMovement({
      restaurantId: 42,
      registerId: "reg_1",
      movementType: "paid_out",
      amount: "10.00",
      reason: "petty cash",
      idempotencyKey: "key-out",
      at: "t4",
    });
    const replay = await caller.crmp.financialShift.recordDrawerMovement({
      restaurantId: 42,
      registerId: "reg_1",
      movementType: "paid_out",
      amount: "10.00",
      reason: "petty cash",
      idempotencyKey: "key-out",
      at: "t5",
    });
    expect(replay.alreadyApplied).toBe(true);
    expect(replay.movement.movementId).toBe(first.movement.movementId);
    expect(replay.shift.expectedCashAmount).toBe(first.shift.expectedCashAmount);

    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_out",
        amount: "20.00",
        reason: "petty cash",
        idempotencyKey: "key-out",
        at: "t6",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("stamps actor from the authenticated user and ignores extra cashier fields", async () => {
    const caller = createVerifiedCaller(22);
    await openDutyAndShift(caller);
    const result = await caller.crmp.financialShift.recordDrawerMovement({
      restaurantId: 42,
      registerId: "reg_1",
      movementType: "safe_drop",
      amount: "5.00",
      reason: "safe",
      idempotencyKey: "key-drop",
      actorUserId: 999,
      operatorUserId: 888,
      cashierId: 777,
    } as never);
    expect(result.movement.actorUserId).toBe(22);
  });

  it("rejects missing permission, unauthenticated callers, and cross-restaurant ids", async () => {
    const caller = createVerifiedCaller();
    await openDutyAndShift(caller);

    vi.mocked(assertRestaurantAccess).mockRejectedValueOnce(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );
    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        idempotencyKey: "denied",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const anon = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      anon.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        idempotencyKey: "anon",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 99,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        idempotencyKey: "cross-reg",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_other",
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        idempotencyKey: "cross-shift",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("requires an open shift and rejects closed shift, hint mismatch, and overdraft", async () => {
    const caller = createVerifiedCaller();
    await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        idempotencyKey: "no-shift",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await caller.crmp.financialShift.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      openingFloatAmount: "100.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_api_1",
      at: "t3",
    });

    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        financialShiftId: "fsh_wrong",
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        idempotencyKey: "mismatch",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_out",
        amount: "200.00",
        reason: "too much",
        idempotencyKey: "overdraft",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "1.00",
        currencyCode: "USD",
        reason: "fx",
        idempotencyKey: "fx",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await caller.crmp.financialShift.close({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      at: "t8",
    });
    await expect(
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "1.00",
        reason: "after close",
        idempotencyKey: "closed",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("serializes concurrent distinct keys and does not duplicate the same key", async () => {
    const caller = createVerifiedCaller();
    await openDutyAndShift(caller);
    const [a, b] = await Promise.all([
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "3.00",
        reason: "a",
        idempotencyKey: "same-key",
        at: "t4",
      }),
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "3.00",
        reason: "a",
        idempotencyKey: "same-key",
        at: "t4",
      }),
    ]);
    expect(a.movement.movementId).toBe(b.movement.movementId);
    expect(a.alreadyApplied && b.alreadyApplied).toBe(false);
    const current = await caller.crmp.financialShift.getCurrent({
      restaurantId: 42,
      registerId: "reg_1",
    });
    expect(current?.expectedCashAmount).toBe("103.00");

    const [c, d] = await Promise.all([
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "manual_adjustment",
        amount: "-1.00",
        reason: "correct",
        idempotencyKey: "adj-1",
      }),
      caller.crmp.financialShift.recordDrawerMovement({
        restaurantId: 42,
        registerId: "reg_1",
        movementType: "paid_in",
        amount: "2.00",
        reason: "other",
        idempotencyKey: "in-2",
      }),
    ]);
    expect(c.alreadyApplied).toBe(false);
    expect(d.alreadyApplied).toBe(false);
    const after = await caller.crmp.financialShift.getCurrent({
      restaurantId: 42,
      registerId: "reg_1",
    });
    expect(after?.expectedCashAmount).toBe("104.00");
  });
});
