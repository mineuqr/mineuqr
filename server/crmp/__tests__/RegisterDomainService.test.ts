import { beforeEach, describe, expect, it } from "vitest";
import {
  CrmpConflictError,
  CrmpInvariantError,
} from "@shared/crmp";
import { createInMemoryCrmpStore } from "../InMemoryCrmpStore";
import { RegisterDomainService } from "../RegisterDomainService";
import { FinancialShiftDomainService } from "../FinancialShiftDomainService";

describe("RegisterDomainService", () => {
  let registers: RegisterDomainService;
  let shifts: FinancialShiftDomainService;

  beforeEach(() => {
    const uow = createInMemoryCrmpStore();
    registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
  });

  async function provisionAndActivate(registerId = "reg_1") {
    await registers.provision({
      restaurantId: 1,
      code: "C1",
      displayName: "Counter 1",
      registerType: "counter",
      registerId,
      at: "t0",
    });
    await registers.activate({
      restaurantId: 1,
      registerId,
      at: "t1",
    });
  }

  it("provisions and activates a register with Duty closed", async () => {
    const { register: r } = await registers.provision({
      restaurantId: 1,
      code: "C1",
      displayName: "Counter 1",
      registerType: "counter",
      registerId: "reg_fixed",
      at: "t0",
    });
    expect(r.status).toBe("provisioned");
    expect(r.dutyStatus).toBe("closed");
    expect(r.code).toBe("C1");
    expect(r.registerType).toBe("counter");
    const { register: active } = await registers.activate({
      restaurantId: 1,
      registerId: "reg_fixed",
      at: "t1",
    });
    expect(active.status).toBe("active");
    expect(active.dutyStatus).toBe("closed");
  });

  it("opens Duty, assigns operator, suspends, resumes, closes", async () => {
    await provisionAndActivate();
    const opened = await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    expect(opened.register.dutyStatus).toBe("open");
    expect(opened.events.map((e) => e.eventType)).toEqual([
      "RegisterOpened",
      "OperatorAssigned",
    ]);

    const suspended = await registers.suspend({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t3",
    });
    expect(suspended.register.dutyStatus).toBe("suspended");
    expect(suspended.events[0]?.eventType).toBe("RegisterSuspended");

    const resumed = await registers.resume({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t4",
    });
    expect(resumed.register.dutyStatus).toBe("open");

    const closed = await registers.close({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t5",
    });
    expect(closed.register.dutyStatus).toBe("closed");
    expect(closed.register.assignedOperatorUserId).toBeNull();
    expect(closed.events.map((e) => e.eventType)).toContain("RegisterClosed");
    expect(closed.events.map((e) => e.eventType)).toContain("OperatorReleased");
  });

  it("refuses close / deactivate while shift active", async () => {
    await provisionAndActivate();
    await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 7,
      openingFloatAmount: "50.00",
      currencyCode: "SAR",
      at: "t3",
    });
    await expect(
      registers.close({ restaurantId: 1, registerId: "reg_1", at: "t4" })
    ).rejects.toBeInstanceOf(CrmpInvariantError);
    await expect(
      registers.deactivate({ restaurantId: 1, registerId: "reg_1", at: "t4" })
    ).rejects.toBeInstanceOf(CrmpInvariantError);
  });

  it("refuses Financial Shift open when Duty closed", async () => {
    await provisionAndActivate();
    await expect(
      shifts.open({
        restaurantId: 1,
        registerId: "reg_1",
        operatorUserId: 7,
        openingFloatAmount: "50.00",
        currencyCode: "SAR",
        at: "t2",
      })
    ).rejects.toBeInstanceOf(CrmpInvariantError);
  });

  it("attaches, replaces, detaches device with events", async () => {
    await provisionAndActivate();
    const attached = await registers.attachDevice({
      restaurantId: 1,
      registerId: "reg_1",
      deviceId: "dev_abc",
      at: "t1",
    });
    expect(attached.register.deviceId).toBe("dev_abc");
    expect(attached.events[0]?.eventType).toBe("DeviceAttached");

    const replaced = await registers.replaceDevice({
      restaurantId: 1,
      registerId: "reg_1",
      deviceId: "dev_xyz",
      at: "t2",
    });
    expect(replaced.register.deviceId).toBe("dev_xyz");
    expect(replaced.events.map((e) => e.eventType)).toEqual([
      "DeviceDetached",
      "DeviceAttached",
    ]);

    const detached = await registers.detachDevice({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t3",
    });
    expect(detached.register.deviceId).toBeNull();
  });

  it("reassigns operator and resolves active register", async () => {
    await provisionAndActivate();
    await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t2",
    });
    await registers.assignOperator({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t3",
    });
    const reassigned = await registers.reassignOperator({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 8,
      at: "t4",
    });
    expect(reassigned.register.assignedOperatorUserId).toBe(8);

    const resolved = await registers.resolveActive({ restaurantId: 1, at: "t5" });
    expect(resolved.register.registerId).toBe("reg_1");
    expect(resolved.events[0]?.eventType).toBe("RegisterResolved");

    const byOp = await registers.resolveByOperator({
      restaurantId: 1,
      operatorUserId: 8,
      at: "t6",
    });
    expect(byOp.register.registerId).toBe("reg_1");
  });

  it("rejects concurrent update via version conflict", async () => {
    await provisionAndActivate();
    const opened = await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t2",
    });
    await expect(
      registers.suspend({
        restaurantId: 1,
        registerId: "reg_1",
        at: "t3",
        expectedVersion: opened.register.version - 1,
      })
    ).rejects.toBeInstanceOf(CrmpConflictError);
  });

  it("idempotent duplicate open / suspend / close", async () => {
    await provisionAndActivate();
    await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t2",
    });
    const again = await registers.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 7,
      at: "t3",
    });
    expect(again.alreadyApplied).toBe(true);
    expect(again.events).toEqual([]);

    await registers.suspend({ restaurantId: 1, registerId: "reg_1", at: "t4" });
    const suspAgain = await registers.suspend({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t5",
    });
    expect(suspAgain.alreadyApplied).toBe(true);

    await registers.resume({ restaurantId: 1, registerId: "reg_1", at: "t6" });
    await registers.close({ restaurantId: 1, registerId: "reg_1", at: "t7" });
    const closeAgain = await registers.close({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t8",
    });
    expect(closeAgain.alreadyApplied).toBe(true);
  });
});
