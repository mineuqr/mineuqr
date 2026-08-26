import { beforeEach, describe, expect, it } from "vitest";
import {
  CrmpConflictError,
  CrmpImmutabilityError,
  CrmpInvariantError,
} from "@shared/crmp";
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
      code: "FRONT",
      displayName: "Front",
      registerType: "counter",
      registerId: "reg_1",
      at: "t0",
    });
    await registers.activate({ restaurantId: 1, registerId: "reg_1", at: "t1" });
    await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      at: "t1b",
    });
  });

  it("opens shift and persists expected cash path", async () => {
    const { shift, events } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "100.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    expect(shift.drawer.movements[0]?.movementType).toBe("opening_float");
    expect(events[0]?.eventType).toBe("FinancialShiftOpened");
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

  it("replays recordMovement when movementId matches", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "100.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    const first = await shifts.recordMovement({
      restaurantId: 1,
      financialShiftId: "fsh_1",
      movementType: "paid_in",
      amount: "10.00",
      reason: "bag",
      actorUserId: 10,
      at: "t3",
      movementId: "mov_retry",
    });
    const second = await shifts.recordMovement({
      restaurantId: 1,
      financialShiftId: "fsh_1",
      movementType: "paid_in",
      amount: "10.00",
      reason: "bag",
      actorUserId: 10,
      at: "t4",
      movementId: "mov_retry",
    });
    expect(second.alreadyApplied).toBe(true);
    expect(second.shift.version).toBe(first.shift.version);
    expect(
      second.shift.drawer.movements.filter((m) => m.movementType === "paid_in")
    ).toHaveLength(1);
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

  it("open is idempotent by financialShiftId", async () => {
    const first = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    const second = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t3",
    });
    expect(second.alreadyApplied).toBe(true);
    expect(second.shift.version).toBe(first.shift.version);
  });

  it("attribution idempotent by settlementRecordId", async () => {
    const { shift } = await shifts.open({
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
    const { shift } = await shifts.open({
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
    const { shift } = await shifts.open({
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
    expect(closed.closeReason).toBe("handover");
    expect(successor.operatorUserId).toBe(20);
    expect(successor.openingFloatAmount).toBe("75.00");
  });

  it("suspend/resume and beginClose/close corridor", async () => {
    const { shift } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "50.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    const suspended = await shifts.suspend({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t3",
    });
    expect(suspended.shift.status).toBe("suspended");
    expect(suspended.events[0]?.eventType).toBe("FinancialShiftSuspended");

    const resumed = await shifts.resume({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t4",
    });
    expect(resumed.shift.status).toBe("open");

    const closing = await shifts.beginClose({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t5",
    });
    expect(closing.shift.status).toBe("closing");
    expect(closing.events[0]?.eventType).toBe("FinancialShiftClosingStarted");

    await shifts.recordCount({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      kind: "final",
      actualAmount: "50.00",
      actorUserId: 10,
      at: "t6",
    });
    const closed = await shifts.close({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t7",
    });
    expect(closed.shift.status).toBe("closed");
    expect(closed.events[0]?.eventType).toBe("FinancialShiftClosed");

    const again = await shifts.close({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t8",
    });
    expect(again.alreadyApplied).toBe(true);

    const archived = await shifts.archive({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t9",
    });
    expect(archived.shift.status).toBe("archived");
    expect(archived.events[0]?.eventType).toBe("FinancialShiftArchived");
  });

  it("abort close when no final count; block after final count", async () => {
    const { shift } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "10.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    await shifts.beginClose({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t3",
    });
    const aborted = await shifts.abortClose({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t4",
    });
    expect(aborted.shift.status).toBe("open");

    await shifts.beginClose({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t5",
    });
    await shifts.recordCount({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      kind: "final",
      actualAmount: "10.00",
      actorUserId: 10,
      at: "t6",
    });
    await expect(
      shifts.abortClose({
        restaurantId: 1,
        financialShiftId: shift.financialShiftId,
        at: "t7",
      })
    ).rejects.toBeInstanceOf(CrmpInvariantError);
  });

  it("cancelOpen on empty shift; reject when not empty", async () => {
    const { shift } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "5.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    const cancelled = await shifts.cancelOpen({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t3",
    });
    expect(cancelled.shift.status).toBe("closed");
    expect(cancelled.shift.closeReason).toBe("cancelled_empty");

    const { shift: s2 } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "5.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_2",
      at: "t4",
    });
    await shifts.recordMovement({
      restaurantId: 1,
      financialShiftId: s2.financialShiftId,
      movementType: "paid_in",
      amount: "1.00",
      reason: "x",
      actorUserId: 10,
      at: "t5",
    });
    await expect(
      shifts.cancelOpen({
        restaurantId: 1,
        financialShiftId: s2.financialShiftId,
        at: "t6",
      })
    ).rejects.toBeInstanceOf(CrmpInvariantError);
  });

  it("resolve active / by register / by operator", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    const active = await shifts.resolveActive({
      restaurantId: 1,
      registerId: "reg_1",
    });
    expect(active?.financialShiftId).toBe("fsh_1");
    const byOp = await shifts.resolveByOperator({
      restaurantId: 1,
      operatorUserId: 10,
    });
    expect(byOp?.financialShiftId).toBe("fsh_1");
    expect(
      await shifts.resolveByOperator({ restaurantId: 1, operatorUserId: 99 })
    ).toBeNull();
  });

  it("register deactivate blocked while suspended shift active", async () => {
    const { shift } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    await shifts.suspend({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t3",
    });
    await expect(
      registers.deactivate({ restaurantId: 1, registerId: "reg_1", at: "t4" })
    ).rejects.toBeInstanceOf(CrmpInvariantError);
  });

  it("concurrent save rejects on version conflict", async () => {
    const { shift } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    await shifts.suspend({
      restaurantId: 1,
      financialShiftId: shift.financialShiftId,
      at: "t3",
      expectedVersion: shift.version,
    });
    await expect(
      shifts.resume({
        restaurantId: 1,
        financialShiftId: shift.financialShiftId,
        at: "t4",
        expectedVersion: shift.version,
      })
    ).rejects.toBeInstanceOf(CrmpConflictError);
  });

  it("closeWithFinalCount is idempotent and reuses a persisted final count", async () => {
    await shifts.open({
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
      financialShiftId: "fsh_1",
      kind: "final",
      actualAmount: "40.00",
      actorUserId: 10,
      at: "t3",
    });
    const closed = await shifts.closeWithFinalCount({
      restaurantId: 1,
      financialShiftId: "fsh_1",
      actualCashAmount: "40.00",
      actorUserId: 10,
      closeDuty: true,
      at: "t4",
    });
    expect(closed.shift.status).toBe("closed");
    expect(
      closed.shift.drawer.counts.filter((c) => c.kind === "final")
    ).toHaveLength(1);
    const duty = await registers.get(1, "reg_1");
    expect(duty?.dutyStatus).toBe("closed");

    const again = await shifts.closeWithFinalCount({
      restaurantId: 1,
      financialShiftId: "fsh_1",
      actualCashAmount: "40.00",
      actorUserId: 10,
      closeDuty: true,
      at: "t5",
    });
    expect(again.alreadyApplied).toBe(true);
    expect(
      again.shift.drawer.counts.filter((c) => c.kind === "final")
    ).toHaveLength(1);

    await expect(
      shifts.closeWithFinalCount({
        restaurantId: 1,
        financialShiftId: "fsh_1",
        actualCashAmount: "41.00",
        actorUserId: 10,
        closeDuty: true,
        at: "t6",
      })
    ).resolves.toMatchObject({ alreadyApplied: true });
  });

  it("closeWithFinalCount rejects a conflicting count while the shift is still open", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "40.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_open",
      at: "t2",
    });
    await shifts.recordCount({
      restaurantId: 1,
      financialShiftId: "fsh_open",
      kind: "final",
      actualAmount: "40.00",
      actorUserId: 10,
      at: "t3",
    });
    await expect(
      shifts.closeWithFinalCount({
        restaurantId: 1,
        financialShiftId: "fsh_open",
        actualCashAmount: "10.00",
        actorUserId: 10,
        at: "t4",
      })
    ).rejects.toBeInstanceOf(CrmpConflictError);
  });

  it("closeWithFinalCount reports stale version", async () => {
    const { shift } = await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "12.00",
      currencyCode: "SAR",
      financialShiftId: "fsh_ver",
      at: "t2",
    });
    await expect(
      shifts.closeWithFinalCount({
        restaurantId: 1,
        financialShiftId: "fsh_ver",
        actualCashAmount: "12.00",
        actorUserId: 10,
        expectedVersion: shift.version - 1,
        at: "t3",
      })
    ).rejects.toBeInstanceOf(CrmpConflictError);
  });
});
