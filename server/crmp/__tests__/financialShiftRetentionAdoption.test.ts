/**
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — DRAP + archive list.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  activateRegister,
  openRegister,
  provisionRegister,
} from "@shared/crmp";
import { createInMemoryCrmpStore } from "../InMemoryCrmpStore";
import { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import { RegisterDomainService } from "../RegisterDomainService";
import { CrmpFinancialShiftOperationsService } from "../api/crmpFinancialShiftOperationsService";
import {
  getFinancialShiftDrapPlatform,
  resolveFinancialShiftDisplayWindow,
} from "../retention/financialShiftDrapAdoption";

async function seedClosedShift() {
  const uow = createInMemoryCrmpStore();
  const registers = new RegisterDomainService(uow);
  const shifts = new FinancialShiftDomainService(uow);
  const ops = new CrmpFinancialShiftOperationsService(shifts, registers);

  await uow.registers.insert(
    openRegister({
      register: activateRegister({
        register: provisionRegister({
          registerId: "reg_1",
          restaurantId: 1,
          code: "FRONT",
          registerType: "counter",
          displayName: "Front",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
        at: "2026-01-01T00:00:01.000Z",
      }),
      at: "2026-01-01T00:00:02.000Z",
      operatorUserId: 10,
    })
  );

  const opened = await shifts.open({
    restaurantId: 1,
    registerId: "reg_1",
    operatorUserId: 10,
    openingFloatAmount: "10.00",
    currencyCode: "SAR",
    at: "2026-07-01T08:00:00.000Z",
    financialShiftId: "fsh_ret_1",
  });
  expect(opened.shift.shiftNumber).toBe(1);

  await shifts.recordCount({
    restaurantId: 1,
    financialShiftId: "fsh_ret_1",
    kind: "final",
    actualAmount: "10.00",
    actorUserId: 10,
    at: "2026-07-01T18:00:00.000Z",
  });
  await shifts.close({
    restaurantId: 1,
    financialShiftId: "fsh_ret_1",
    at: "2026-07-01T18:00:01.000Z",
  });

  return { ops, shifts };
}

describe("Financial Shift retention adoption", () => {
  it("registers financial_shift DRAP policy with 30-day display window", () => {
    const platform = getFinancialShiftDrapPlatform();
    const resolved = platform.resolvePolicy({
      entityType: "financial_shift",
      restaurantId: 1,
    });
    expect(resolved.policy.displayWindowDays).toBe(30);
    expect(resolved.policy.purgeEnabled).toBe(false);
    expect(resolved.policy.archiveEnabled).toBe(true);
  });

  it("lists archive within default display window", async () => {
    const { ops } = await seedClosedShift();
    const window = resolveFinancialShiftDisplayWindow({
      restaurantId: 1,
      preset: "last_30",
      nowIso: "2026-07-20T00:00:00.000Z",
    });
    expect(window.displayWindowDays).toBe(30);
    expect(window.fromIso).toBeTruthy();

    const listed = await ops.listArchive({
      restaurantId: 1,
      preset: "all",
    });
    expect(listed.items.length).toBeGreaterThanOrEqual(1);
    expect(listed.items[0]?.shiftNumber).toBe(1);
  });

  it("builds closing report from stored amounts", async () => {
    const { ops } = await seedClosedShift();
    const report = await ops.getClosingReport({
      restaurantId: 1,
      financialShiftId: "fsh_ret_1",
    });
    expect(report.shiftNumber).toBe(1);
    expect(report.expectedCashAmount).toBe("10.00");
    expect(report.actualCashAmount).toBe("10.00");
    expect(report.differenceAmount).toBe("0.00");
  });
});
