/**
 * CRMP-OPERATIONS-API-1 — router auth, tenant isolation, commands, queries.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../../../_core/context";
import { createInMemoryCrmpStore } from "../../InMemoryCrmpStore";
import { RegisterDomainService } from "../../RegisterDomainService";
import { FinancialShiftDomainService } from "../../FinancialShiftDomainService";
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

describe("crmp.register API", () => {
  let registers: RegisterDomainService;
  let shifts: FinancialShiftDomainService;

  beforeEach(async () => {
    vi.mocked(assertRestaurantAccess).mockReset();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    const uow = createInMemoryCrmpStore();
    setCrmpApiUnitOfWorkForTests(uow);
    registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    await registers.provision({
      restaurantId: 42,
      displayName: "Counter 1",
      registerId: "reg_1",
      at: "t0",
    });
    await registers.activate({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t1",
    });
  });

  afterEach(() => {
    setCrmpApiUnitOfWorkForTests(null);
  });

  it("opens, suspends, resumes, closes register", async () => {
    const caller = createVerifiedCaller();
    const opened = await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    expect(opened.register.dutyStatus).toBe("open");
    expect(opened.register.assignedOperatorUserId).toBe(7);
    expect(opened.alreadyApplied).toBe(false);
    expect(opened).not.toHaveProperty("events");

    const suspended = await caller.crmp.register.suspend({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t3",
    });
    expect(suspended.register.dutyStatus).toBe("suspended");

    const resumed = await caller.crmp.register.resume({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t4",
    });
    expect(resumed.register.dutyStatus).toBe("open");

    const closed = await caller.crmp.register.close({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t5",
    });
    expect(closed.register.dutyStatus).toBe("closed");
    expect(closed.register.assignedOperatorUserId).toBeNull();
  });

  it("assign / release / reassign operator", async () => {
    const caller = createVerifiedCaller();
    await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t2",
    });
    const assigned = await caller.crmp.register.assignOperator({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t3",
    });
    expect(assigned.register.assignedOperatorUserId).toBe(7);

    const reassigned = await caller.crmp.register.reassignOperator({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 8,
      at: "t4",
    });
    expect(reassigned.register.assignedOperatorUserId).toBe(8);

    const released = await caller.crmp.register.releaseOperator({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t5",
    });
    expect(released.register.assignedOperatorUserId).toBeNull();
  });

  it("attach / replace / detach device", async () => {
    const caller = createVerifiedCaller();
    const attached = await caller.crmp.register.attachDevice({
      restaurantId: 42,
      registerId: "reg_1",
      deviceId: "dev_1",
      at: "t2",
    });
    expect(attached.register.deviceId).toBe("dev_1");

    const replaced = await caller.crmp.register.replaceDevice({
      restaurantId: 42,
      registerId: "reg_1",
      deviceId: "dev_2",
      at: "t3",
    });
    expect(replaced.register.deviceId).toBe("dev_2");

    const detached = await caller.crmp.register.detachDevice({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t4",
    });
    expect(detached.register.deviceId).toBeNull();
  });

  it("resolves active / by device / by operator and lists available", async () => {
    const caller = createVerifiedCaller();
    await caller.crmp.register.attachDevice({
      restaurantId: 42,
      registerId: "reg_1",
      deviceId: "dev_1",
      at: "t2",
    });
    await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 9,
      at: "t3",
    });

    const active = await caller.crmp.register.resolveActive({
      restaurantId: 42,
    });
    expect(active.registerId).toBe("reg_1");

    const byDevice = await caller.crmp.register.resolveByDevice({
      restaurantId: 42,
      deviceId: "dev_1",
    });
    expect(byDevice.registerId).toBe("reg_1");

    const byOp = await caller.crmp.register.resolveByOperator({
      restaurantId: 42,
      operatorUserId: 9,
    });
    expect(byOp.registerId).toBe("reg_1");

    const available = await caller.crmp.register.listAvailable({
      restaurantId: 42,
    });
    expect(available).toHaveLength(1);

    const current = await caller.crmp.register.getCurrent({
      restaurantId: 42,
      registerId: "reg_1",
    });
    expect(current.dutyStatus).toBe("open");
    expect(current.operatorUserId).toBe(9);
    expect(current.deviceId).toBe("dev_1");
    expect(current.financialShift).toBeNull();
  });

  it("returns financial shift reference and history", async () => {
    const caller = createVerifiedCaller();
    await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    await shifts.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      openingFloatAmount: "50.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t3",
    });

    const ref = await caller.crmp.register.getCurrentFinancialShift({
      restaurantId: 42,
      registerId: "reg_1",
    });
    expect(ref?.financialShiftId).toBe("fsh_1");
    expect(ref).not.toHaveProperty("drawer");
    expect(ref).not.toHaveProperty("attributions");

    const history = await caller.crmp.register.getHistory({
      restaurantId: 42,
      registerId: "reg_1",
    });
    expect(history.shifts).toHaveLength(1);
  });

  it("idempotent duplicate open", async () => {
    const caller = createVerifiedCaller();
    await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    const again = await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t3",
    });
    expect(again.alreadyApplied).toBe(true);
  });

  it("maps close-with-active-shift to CONFLICT", async () => {
    const caller = createVerifiedCaller();
    await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    await shifts.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      openingFloatAmount: "10.00",
      currencyCode: "SAR",
      at: "t3",
    });
    await expect(
      caller.crmp.register.close({
        restaurantId: 42,
        registerId: "reg_1",
        at: "t4",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("maps concurrency conflict", async () => {
    const caller = createVerifiedCaller();
    const opened = await caller.crmp.register.open({
      restaurantId: 42,
      registerId: "reg_1",
      at: "t2",
    });
    await expect(
      caller.crmp.register.suspend({
        restaurantId: 42,
        registerId: "reg_1",
        expectedVersion: opened.register.version - 1,
        at: "t3",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("enforces restaurant access and rejects unauthenticated", async () => {
    const caller = createVerifiedCaller();
    vi.mocked(assertRestaurantAccess).mockRejectedValueOnce(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );
    await expect(
      caller.crmp.register.listAvailable({ restaurantId: 99 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const anon = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      anon.crmp.register.listAvailable({ restaurantId: 42 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("validates DTO input", async () => {
    const caller = createVerifiedCaller();
    await expect(
      caller.crmp.register.open({
        restaurantId: -1,
        registerId: "reg_1",
      } as never)
    ).rejects.toBeTruthy();
  });

  it("not found maps to NOT_FOUND", async () => {
    const caller = createVerifiedCaller();
    await expect(
      caller.crmp.register.get({
        restaurantId: 42,
        registerId: "missing",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
