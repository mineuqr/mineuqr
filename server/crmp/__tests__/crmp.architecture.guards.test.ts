/**
 * CRMP + SHIFT-LIFECYCLE-IMPLEMENTATION-1 — architecture compliance guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CRMP / SHIFT-LIFECYCLE architecture guards", () => {
  it("shared domain does not import Settlement / Check / Reporting", () => {
    const files = [
      "shared/crmp/index.ts",
      "shared/crmp/financialShift/financialShiftCommands.ts",
      "shared/crmp/financialShift/financialShiftEvents.ts",
      "shared/crmp/register/registerCommands.ts",
      "server/crmp/FinancialShiftDomainService.ts",
      "server/crmp/RegisterDomainService.ts",
      "server/crmp/DrizzleCrmpRepository.ts",
      "server/crmp/SettlementContextResolver.ts",
      "shared/crmp/settlementContext/resolveSettlementContext.ts",
      "server/crmp/api/crmpRegisterOperationsService.ts",
      "server/crmp/api/crmpApiMapper.ts",
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/settleCheckPaid|SettleOrderPaid|settlementRecordRead|CheckService/);
      expect(src, f).not.toMatch(/from ["']@shared\/operational-session/);
      expect(src, f).not.toMatch(/reporting-platform/);
    }
  });

  it("CRMP API façade does not contain financial calculations", () => {
    const router = read("server/crmp/api/crmpRouter.ts");
    expect(router).toContain("CRMP-OPERATIONS-API-1");
    expect(router).not.toMatch(/computeExpectedCash|grandTotal|toCents/);
    const svc = read("server/crmp/api/crmpRegisterOperationsService.ts");
    expect(svc).not.toMatch(/computeExpectedCash|grandTotal|toCents/);
  });

  it("settlement context never fabricates Register or Shift", () => {
    const resolve = read(
      "shared/crmp/settlementContext/resolveSettlementContext.ts"
    );
    expect(resolve).toContain("Never fabricates");
    expect(resolve).not.toContain("openFinancialShift");
    expect(resolve).not.toContain("provisionRegister");
  });

  it("attribution adoption helpers never recalculate Check money", () => {
    const adoption = read(
      "shared/crmp/settlementContext/settlementAttributionAdoption.ts"
    );
    expect(adoption).toContain("never recalculates Check totals");
    expect(adoption).not.toContain("computeCheckMoney");
    expect(adoption).not.toContain("grandTotal");
    const hook = read(
      "server/operational-session/check/checkSettlementAttributionAdoption.ts"
    );
    expect(hook).toContain("AFTER Check-owned financial TX");
    expect(hook).toContain("Never mutates Settlement Record");
    expect(hook).not.toContain("finalizeCheckOutcome");
  });

  it("migration 0077 is additive CRMP-only", () => {
    const sql = read("drizzle/0077_crmp.sql");
    expect(sql).toContain("CREATE TABLE `crmp_registers`");
    expect(sql).toContain("CREATE TABLE `crmp_financial_shifts`");
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `settlement_records`/);
    expect(sql).not.toMatch(/DROP TABLE/);
  });

  it("migration 0078 is additive shift lifecycle only", () => {
    const sql = read("drizzle/0078_crmp_shift_lifecycle.sql");
    expect(sql).toContain("crmp_financial_shifts");
    expect(sql).toContain("suspended");
    expect(sql).toContain("closing");
    expect(sql).toContain("archived");
    expect(sql).toContain("closeReason");
    expect(sql).not.toMatch(/operational_checks/);
    expect(sql).not.toMatch(/settlement_records/);
    expect(sql).not.toMatch(/DROP TABLE/);
  });

  it("migration 0079 is additive Register Duty only", () => {
    const sql = read("drizzle/0079_crmp_register_duty.sql");
    expect(sql).toContain("crmp_registers");
    expect(sql).toContain("dutyStatus");
    expect(sql).toContain("assignedOperatorUserId");
    expect(sql).toContain("operatorAssignedAt");
    expect(sql).not.toMatch(/operational_checks/);
    expect(sql).not.toMatch(/settlement_records/);
    expect(sql).not.toMatch(/crmp_financial_shifts/);
    expect(sql).not.toMatch(/DROP TABLE/);
  });

  it("schema exports ADR-030 shift statuses and Register Duty", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("crmpRegisters");
    expect(schema).toContain("suspended");
    expect(schema).toContain("closing");
    expect(schema).toContain("archived");
    expect(schema).toContain("SHIFT-LIFECYCLE-IMPLEMENTATION-1");
    expect(schema).toContain("REGISTER-OPERATIONS-IMPLEMENTATION-1");
    expect(schema).toContain("dutyStatus");
    expect(schema).toContain("assignedOperatorUserId");
  });

  it("journal includes 0077–0079", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0077_crmp");
    expect(journal).toContain("0078_crmp_shift_lifecycle");
    expect(journal).toContain("0079_crmp_register_duty");
  });

  it("domain barrel marks ADR-028 program", () => {
    const idx = read("shared/crmp/index.ts");
    expect(idx).toContain("CRMP-IMPLEMENTATION-1");
    expect(idx).toContain("ADR-ARCH-028");
  });

  it("lifecycle VO marks ADR-030 and forbids pending", () => {
    const vos = read("shared/crmp/valueObjects.ts");
    expect(vos).toContain("ADR-ARCH-030");
    expect(vos).toContain("suspended");
    expect(vos).toMatch(/Persisted `pending` is prohibited/);
  });
});
