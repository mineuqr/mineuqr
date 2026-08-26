/**
 * REGISTER-CLOSE-IDEMPOTENT-ATOMIC-CORRIDOR-1
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../../../_core/context";
import { createInMemoryCrmpStore } from "../../InMemoryCrmpStore";
import { RegisterDomainService } from "../../RegisterDomainService";
import { FinancialShiftDomainService } from "../../FinancialShiftDomainService";
import { setCrmpApiUnitOfWorkForTests } from "../crmpApiComposition";
import { CrmpFinancialShiftOperationsService } from "../crmpFinancialShiftOperationsService";

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

describe("crmp.financialShift.close corridor", () => {
  let registers: RegisterDomainService;
  let shifts: FinancialShiftDomainService;
  let ops: CrmpFinancialShiftOperationsService;

  beforeEach(async () => {
    vi.mocked(assertRestaurantAccess).mockReset();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    const uow = createInMemoryCrmpStore();
    setCrmpApiUnitOfWorkForTests(uow);
    registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    ops = new CrmpFinancialShiftOperationsService(shifts, registers);
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
    await registers.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    await shifts.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      openingFloatAmount: "100.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_api_1",
      at: "t3",
    });
  });

  afterEach(() => {
    setCrmpApiUnitOfWorkForTests(null);
  });

  it("A. normal close records one final count and closes shift + duty", async () => {
    const caller = createVerifiedCaller();
    const closed = await caller.crmp.financialShift.close({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      closeDuty: true,
      closeIdempotencyKey: "close-key-normal-01",
      at: "t4",
    });
    expect(closed.shift.status).toBe("closed");
    expect(closed.shift.finalCount?.actualAmount).toBe("100.00");
    const duty = await registers.get(42, "reg_1");
    expect(duty?.dutyStatus).toBe("closed");
    const stored = await shifts.get(42, "fsh_api_1");
    expect(stored?.drawer.counts.filter((c) => c.kind === "final")).toHaveLength(
      1
    );
  });

  it("B/C. duplicate and lost-response retry do not add a second final count", async () => {
    const caller = createVerifiedCaller();
    const input = {
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      closeDuty: true,
      closeIdempotencyKey: "close-key-retry-01",
      at: "t4",
    } as const;
    const first = await caller.crmp.financialShift.close(input);
    const second = await caller.crmp.financialShift.close(input);
    expect(first.shift.status).toBe("closed");
    expect(second.shift.status).toBe("closed");
    expect(second.alreadyApplied).toBe(true);
    const stored = await shifts.get(42, "fsh_api_1");
    expect(stored?.drawer.counts.filter((c) => c.kind === "final")).toHaveLength(
      1
    );
  });

  it("D. matching final count is reused; different amount conflicts while open", async () => {
    await shifts.recordCount({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      kind: "final",
      actualAmount: "100.00",
      actorUserId: 7,
      at: "t3b",
    });
    const reused = await ops.close({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      closeDuty: true,
      closeIdempotencyKey: "close-key-reuse-01",
      at: "t4",
    });
    expect(reused.shift.status).toBe("closed");
    expect(
      (await shifts.get(42, "fsh_api_1"))?.drawer.counts.filter(
        (c) => c.kind === "final"
      )
    ).toHaveLength(1);

    await registers.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t5",
    });
    await shifts.open({
      restaurantId: 42,
      registerId: "reg_1",
      operatorUserId: 7,
      openingFloatAmount: "50.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_api_2",
      at: "t6",
    });
    await shifts.recordCount({
      restaurantId: 42,
      financialShiftId: "fsh_api_2",
      kind: "final",
      actualAmount: "50.00",
      actorUserId: 7,
      at: "t7",
    });
    await expect(
      ops.close({
        restaurantId: 42,
        financialShiftId: "fsh_api_2",
        actualCashAmount: "10.00",
        actorUserId: 7,
        at: "t8",
      })
    ).rejects.toMatchObject({ name: "CrmpConflictError" });
  });

  it("E. retry after final count without close completes close", async () => {
    await shifts.recordCount({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      kind: "final",
      actualAmount: "100.00",
      actorUserId: 7,
      at: "t3b",
    });
    const open = await shifts.get(42, "fsh_api_1");
    expect(open?.status).not.toBe("closed");
    const closed = await ops.close({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      closeDuty: true,
      at: "t4",
    });
    expect(closed.shift.status).toBe("closed");
    expect(
      (await shifts.get(42, "fsh_api_1"))?.drawer.counts.filter(
        (c) => c.kind === "final"
      )
    ).toHaveLength(1);
  });

  it("F. duty close after shift-only close does not reopen or recount", async () => {
    await ops.close({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      closeDuty: false,
      at: "t4",
    });
    expect((await registers.get(42, "reg_1"))?.dutyStatus).toBe("open");
    const finished = await ops.close({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      closeDuty: true,
      at: "t5",
    });
    expect(finished.shift.status).toBe("closed");
    expect((await registers.get(42, "reg_1"))?.dutyStatus).toBe("closed");
    expect(
      (await shifts.get(42, "fsh_api_1"))?.drawer.counts.filter(
        (c) => c.kind === "final"
      )
    ).toHaveLength(1);
  });

  it("G. stale version is CONFLICT", async () => {
    const caller = createVerifiedCaller();
    const current = await shifts.get(42, "fsh_api_1");
    await expect(
      caller.crmp.financialShift.close({
        restaurantId: 42,
        financialShiftId: "fsh_api_1",
        actualCashAmount: "100.00",
        actorUserId: 7,
        expectedVersion: (current?.version ?? 1) + 9,
        at: "t4",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/stale/i),
    });
  });

  it("H. already closed is idempotent success", async () => {
    const caller = createVerifiedCaller();
    await caller.crmp.financialShift.close({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      closeDuty: true,
      at: "t4",
    });
    const again = await caller.crmp.financialShift.close({
      restaurantId: 42,
      financialShiftId: "fsh_api_1",
      actualCashAmount: "100.00",
      actorUserId: 7,
      closeDuty: true,
      at: "t5",
    });
    expect(again.alreadyApplied).toBe(true);
    expect(again.shift.status).toBe("closed");
  });
});
