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
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/settleCheckPaid|SettleOrderPaid|settlementRecordRead|CheckService/);
      expect(src, f).not.toMatch(/from ["']@shared\/operational-session/);
      expect(src, f).not.toMatch(/reporting-platform/);
    }
  });

  it("settlement context never fabricates Register or Shift", () => {
    const resolve = read(
      "shared/crmp/settlementContext/resolveSettlementContext.ts"
    );
    expect(resolve).toContain("Never fabricates");
    expect(resolve).not.toContain("openFinancialShift");
    expect(resolve).not.toContain("provisionRegister");
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

  it("schema exports ADR-030 shift statuses", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("crmpRegisters");
    expect(schema).toContain("suspended");
    expect(schema).toContain("closing");
    expect(schema).toContain("archived");
    expect(schema).toContain("SHIFT-LIFECYCLE-IMPLEMENTATION-1");
  });

  it("journal includes 0077 and 0078", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0077_crmp");
    expect(journal).toContain("0078_crmp_shift_lifecycle");
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
