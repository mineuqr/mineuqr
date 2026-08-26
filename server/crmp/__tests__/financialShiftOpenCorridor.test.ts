/**
 * Financial Shift open corridor — numbering, uniqueness, rollback semantics.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { CrmpConflictError } from "@shared/crmp";
import { createInMemoryCrmpStore } from "../InMemoryCrmpStore";
import { RegisterDomainService } from "../RegisterDomainService";
import { FinancialShiftDomainService } from "../FinancialShiftDomainService";

async function provisionOpenRegister(
  registers: RegisterDomainService,
  input: { restaurantId: number; registerId: string; operatorUserId: number }
) {
  await registers.provision({
    restaurantId: input.restaurantId,
    code: `C-${input.registerId}`,
    displayName: input.registerId,
    registerType: "counter",
    registerId: input.registerId,
    at: "t0",
  });
  await registers.activate({
    restaurantId: input.restaurantId,
    registerId: input.registerId,
    at: "t1",
  });
  await registers.open({
    restaurantId: input.restaurantId,
    registerId: input.registerId,
    operatorUserId: input.operatorUserId,
    at: "t1b",
  });
}

async function closeCurrentShift(
  shifts: FinancialShiftDomainService,
  restaurantId: number,
  financialShiftId: string,
  at: string
) {
  await shifts.recordCount({
    restaurantId,
    financialShiftId,
    kind: "final",
    actualAmount: "0.00",
    actorUserId: 10,
    at,
  });
  await shifts.close({ restaurantId, financialShiftId, at: `${at}-close` });
}

describe("Financial Shift open corridor", () => {
  let registers: RegisterDomainService;
  let shifts: FinancialShiftDomainService;
  let uow: ReturnType<typeof createInMemoryCrmpStore>;

  beforeEach(async () => {
    uow = createInMemoryCrmpStore();
    registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    await provisionOpenRegister(registers, {
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
    });
  });

  it("opens #000002 after closed #000001 with a new financialShiftId", async () => {
    const first = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    expect(first.shift.shiftNumber).toBe(1);
    await closeCurrentShift(shifts, 1, first.shift.financialShiftId, "t3");
    const second = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "5.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_2",
      at: "t4",
    });
    expect(second.shift.shiftNumber).toBe(2);
    expect(second.shift.financialShiftId).toBe("fsh_2");
    expect(second.shift.status).toBe("open");
    const current = await shifts.resolveActive({
      restaurantId: 1,
      registerId: "reg_1",
    });
    expect(current?.financialShiftId).toBe("fsh_2");
    expect(current?.shiftNumber).toBe(2);
    const listed = await shifts.listByRegister({
      restaurantId: 1,
      registerId: "reg_1",
    });
    const closed = listed.find((s) => s.financialShiftId === "fsh_1");
    expect(closed?.status).toBe("closed");
    expect(closed?.closedAt).toBeTruthy();
  });

  it("forced shift-number collision is CONFLICT and does not reopen #000001", async () => {
    const first = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    await closeCurrentShift(shifts, 1, first.shift.financialShiftId, "t3");
    uow.shifts.allocateNextShiftNumber = async () => 1;
    await expect(
      shifts.open({
        restaurantId: 1,
        registerId: "reg_1",
        operatorUserId: 10,
        openingFloatAmount: "0",
        currencyCode: "SAR",
        financialShiftId: "fsh_new",
        at: "t4",
      })
    ).rejects.toBeInstanceOf(CrmpConflictError);
    const current = await shifts.resolveActive({
      restaurantId: 1,
      registerId: "reg_1",
    });
    expect(current).toBeNull();
    const listed = await shifts.listByRegister({
      restaurantId: 1,
      registerId: "reg_1",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.status).toBe("closed");
    expect(listed[0]?.closedAt).toBeTruthy();
    expect(listed[0]?.financialShiftId).toBe("fsh_1");
  });

  it("failed createShift after allocate does not leave an active shift", async () => {
    const previous = await uow.shifts.allocateNextShiftNumber;
    uow.shifts.allocateNextShiftNumber = async (restaurantId, registerId) => {
      const n = await previous.call(uow.shifts, restaurantId, registerId);
      throw new Error("persistence-stage failure");
      return n;
    };
    await expect(
      shifts.open({
        restaurantId: 1,
        registerId: "reg_1",
        operatorUserId: 10,
        openingFloatAmount: "0",
        currencyCode: "SAR",
        at: "t2",
      })
    ).rejects.toThrow(/persistence-stage failure/);
    expect(
      await shifts.resolveActive({ restaurantId: 1, registerId: "reg_1" })
    ).toBeNull();
  });

  it("successful open identity is coherent for header and opening_float child", async () => {
    const { shift } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "12.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_id",
      at: "t2",
    });
    const loaded = await shifts.get(1, "fsh_id");
    expect(loaded?.financialShiftId).toBe(shift.financialShiftId);
    expect(loaded?.drawer.movements).toHaveLength(1);
    expect(loaded?.drawer.drawerId).toBe(shift.drawer.drawerId);
    const expected = await shifts.getExpectedCash(1, shift.financialShiftId);
    expect(expected).toBe("12.00");
  });

  it("allows the same shift number on another register and restaurant", async () => {
    await provisionOpenRegister(registers, {
      restaurantId: 1,
      registerId: "reg_2",
      operatorUserId: 11,
    });
    await provisionOpenRegister(registers, {
      restaurantId: 2,
      registerId: "reg_1",
      operatorUserId: 12,
    });
    const a = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      at: "t2",
    });
    const b = await shifts.open({
      restaurantId: 1,
      registerId: "reg_2",
      operatorUserId: 11,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      at: "t2b",
    });
    const c = await shifts.open({
      restaurantId: 2,
      registerId: "reg_1",
      operatorUserId: 12,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      at: "t2c",
    });
    expect(a.shift.shiftNumber).toBe(1);
    expect(b.shift.shiftNumber).toBe(1);
    expect(c.shift.shiftNumber).toBe(1);
  });

  it("existing active shift still uses the active-shift CONFLICT", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      at: "t2",
    });
    await expect(
      shifts.open({
        restaurantId: 1,
        registerId: "reg_1",
        operatorUserId: 11,
        openingFloatAmount: "0",
        currencyCode: "SAR",
        at: "t3",
      })
    ).rejects.toMatchObject({
      name: "CrmpConflictError",
      message: "Register already has an active Financial Shift",
    });
  });
});
