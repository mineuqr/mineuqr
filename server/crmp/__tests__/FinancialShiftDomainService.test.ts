import { beforeEach, describe, expect, it } from "vitest";
import { CrmpConflictError, CrmpImmutabilityError } from "@shared/crmp";
import { createInMemoryCrmpStore } from "../InMemoryCrmpStore";
import { RegisterDomainService } from "../RegisterDomainService";
import { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import { DrawerDomainService } from "../DrawerDomainService";

describe("FinancialShiftDomainService + repository", () => {
  let registers: RegisterDomainService;
  let shifts: FinancialShiftDomainService;
  let drawer: DrawerDomainService;

  beforeEach(async () => {
    const uow = createInMemoryCrmpStore();
    registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    drawer = new DrawerDomainService(shifts);
    await registers.provision({
      restaurantId: 1,
      displayName: "Front",
      registerId: "reg_1",
      at: "t0",
    });
    await registers.activate({ restaurantId: 1, registerId: "reg_1", at: "t1" });
  });

  it("opens shift and persists expected cash path", async () => {
    const shift = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "100.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    expect(shift.drawer.movements[0]?.movementType).toBe("opening_float");
    await drawer.recordMovement({
      restaurantId: 1,
      financialShiftId: "fsh_1",
      movementType: "paid_in",
      amount: "10.00",
      reason: "bag",
      actorUserId: 10,
      at: "t3",
    });
    const expected = await drawer.expectedCash(1, "fsh_1");
    expect(expected).toBe("110.00");
  });

  it("enforces one active shift per register", async () => {
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
    ).rejects.toBeInstanceOf(CrmpConflictError);
  });

  it("attribution idempotent by settlementRecordId", async () => {
    const shift = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    const first = await shifts.createAttribution({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      settlementRecordId: "sr:demo",
      operatorUserId: 10,
      cashTenderAmount: "25.00",
      at: "t3",
    });
    const second = await shifts.createAttribution({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      settlementRecordId: "sr:demo",
      operatorUserId: 10,
      cashTenderAmount: "99.00",
      at: "t4",
    });
    expect(first.alreadyApplied).toBe(false);
    expect(second.alreadyApplied).toBe(true);
    expect(second.attribution.cashTenderAmount).toBe("25.00");
  });

  it("close makes shift immutable", async () => {
    const shift = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "40.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    await shifts.recordCount({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      kind: "final",
      actualAmount: "40.00",
      actorUserId: 10,
      at: "t3",
    });
    await shifts.close({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t4",
    });
    await expect(
      shifts.recordMovement({
        restaurantId: 1,
        financialShiftId: shift.financialShiftId,
        movementType: "paid_in",
        amount: "1.00",
        reason: "x",
        actorUserId: 10,
        at: "t5",
      })
    ).rejects.toBeInstanceOf(CrmpImmutabilityError);
  });

  it("handover accept opens successor", async () => {
    const shift = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "80.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    await shifts.initiateHandover({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      initiatorUserId: 10,
      receiverUserId: 20,
      at: "t3",
    });
    await shifts.recordCount({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      kind: "final",
      actualAmount: "75.00",
      actorUserId: 10,
      at: "t4",
    });
    const { closed, successor } = await shifts.acceptHandover({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      acceptingUserId: 20,
      at: "t5",
    });
    expect(closed.status).toBe("closed");
    expect(successor.operatorUserId).toBe(20);
    expect(successor.openingFloatAmount).toBe("75.00");
  });
});
