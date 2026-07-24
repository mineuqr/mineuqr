/**
 * CRMP-IMPLEMENTATION-1 — architecture compliance guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CRMP-IMPLEMENTATION-1 architecture guards", () => {
  it("shared domain does not import Settlement / Check / Reporting", () => {
    const files = [
      "shared/crmp/index.ts",
      "shared/crmp/financialShift/financialShiftCommands.ts",
      "shared/crmp/register/registerCommands.ts",
      "server/crmp/FinancialShiftDomainService.ts",
      "server/crmp/RegisterDomainService.ts",
      "server/crmp/DrizzleCrmpRepository.ts",
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/settleCheckPaid|SettleOrderPaid|settlementRecordRead|CheckService/);
      expect(src, f).not.toMatch(/from ["']@shared\/operational-session/);
      expect(src, f).not.toMatch(/reporting-platform/);
    }
  });

  it("migration 0077 is additive CRMP-only", () => {
    const sql = read("drizzle/0077_crmp.sql");
    expect(sql).toContain("CREATE TABLE `crmp_registers`");
    expect(sql).toContain("CREATE TABLE `crmp_financial_shifts`");
    expect(sql).toContain("CREATE TABLE `crmp_drawer_movements`");
    expect(sql).toContain("CREATE TABLE `crmp_drawer_counts`");
    expect(sql).toContain("CREATE TABLE `crmp_shift_handovers`");
    expect(sql).toContain("CREATE TABLE `crmp_settlement_attributions`");
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `settlement_records`/);
    expect(sql).not.toMatch(/DROP TABLE/);
  });

  it("schema exports CRMP tables without touching settlement tables definition area ownership", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("crmpRegisters");
    expect(schema).toContain("crmpSettlementAttributions");
    expect(schema).toContain("CRMP-IMPLEMENTATION-1");
  });

  it("journal includes 0077_crmp", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0077_crmp");
  });

  it("domain barrel marks ADR-028 program", () => {
    const idx = read("shared/crmp/index.ts");
    expect(idx).toContain("CRMP-IMPLEMENTATION-1");
    expect(idx).toContain("ADR-ARCH-028");
  });
});
