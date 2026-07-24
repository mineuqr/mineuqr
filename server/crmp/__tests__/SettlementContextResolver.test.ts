import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryCrmpStore } from "../InMemoryCrmpStore";
import { RegisterDomainService } from "../RegisterDomainService";
import { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import { SettlementContextResolver } from "../SettlementContextResolver";

describe("SettlementContextResolver", () => {
  let registers: RegisterDomainService;
  let shifts: FinancialShiftDomainService;
  let resolver: SettlementContextResolver;

  beforeEach(async () => {
    const uow = createInMemoryCrmpStore();
    registers = new RegisterDomainService(uow);
    shifts = new FinancialShiftDomainService(uow);
    resolver = new SettlementContextResolver(uow);
    await registers.provision({
      restaurantId: 1,
      displayName: "Front",
      registerId: "reg_1",
      at: "t0",
    });
    await registers.activate({ restaurantId: 1, registerId: "reg_1", at: "t1" });
    await registers.bindDevice({
      restaurantId: 1,
      registerId: "reg_1",
      deviceId: "dev_1",
      at: "t1b",
    });
  });

  it("resolves when open shift exists", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      financialShiftId: "fsh_1",
      at: "t2",
    });
    const ctx = await resolver.resolve({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      at: "t3",
    });
    expect(ctx.status).toBe("resolved");
    expect(ctx.financialShiftId).toBe("fsh_1");
  });

  it("fail-open partial when shift missing", async () => {
    const ctx = await resolver.resolve({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      at: "t3",
    });
    expect(ctx.status).toBe("partial");
    expect(ctx.gaps).toContain("no_active_shift");
    expect(ctx.financialShiftId).toBeNull();
  });

  it("resolves by device", async () => {
    await shifts.open({
      restaurantId: 1,
      registerId: "reg_1",
      operatorUserId: 10,
      openingFloatAmount: "0",
      currencyCode: "SAR",
      at: "t2",
    });
    const ctx = await resolver.resolve({
      restaurantId: 1,
      deviceId: "dev_1",
      operatorUserId: 10,
      at: "t3",
    });
    expect(ctx.status).toBe("resolved");
    expect(ctx.registerId).toBe("reg_1");
  });

  it("unavailable without inventing when no hints", async () => {
    const ctx = await resolver.resolve({ restaurantId: 1, at: "t3" });
    expect(ctx.status).toBe("unavailable");
    expect(ctx.registerId).toBeNull();
    expect(ctx.financialShiftId).toBeNull();
  });
});
