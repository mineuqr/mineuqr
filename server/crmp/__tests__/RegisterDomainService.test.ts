import { beforeEach, describe, expect, it } from "vitest";
import { CrmpInvariantError } from "@shared/crmp";
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

  it("provisions and activates a register", async () => {
    const r = await registers.provision({
      restaurantId: 1,
      displayName: "Counter 1",
      registerId: "reg_fixed",
      at: "t0",
    });
    expect(r.status).toBe("provisioned");
    const active = await registers.activate({
      restaurantId: 1,
      registerId: "reg_fixed",
      at: "t1",
    });
    expect(active.status).toBe("active");
  });

  it("refuses deactivate while shift active", async () => {
    await registers.provision({
      restaurantId: 1,
      displayName: "C1",
      registerId: "reg_1",
      at: "t0",
    });
    await registers.activate({ restaurantId: 1, registerId: "reg_1", at: "t1" });
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 7,
      openingFloatAmount: "50.00",
      currencyCode: "SAR",
      at: "t2",
    });
    await expect(
      registers.deactivate({ restaurantId: 1, registerId: "reg_1", at: "t3" })
    ).rejects.toBeInstanceOf(CrmpInvariantError);
  });

  it("binds and unbinds device reference without erasing history", async () => {
    await registers.provision({
      restaurantId: 1,
      displayName: "C1",
      registerId: "reg_1",
      at: "t0",
    });
    const bound = await registers.bindDevice({
      restaurantId: 1,
      registerId: "reg_1",
      deviceId: "dev_abc",
      at: "t1",
    });
    expect(bound.deviceId).toBe("dev_abc");
    const unbound = await registers.unbindDevice({
      restaurantId: 1,
      registerId: "reg_1",
      at: "t2",
    });
    expect(unbound.deviceId).toBeNull();
  });
});
