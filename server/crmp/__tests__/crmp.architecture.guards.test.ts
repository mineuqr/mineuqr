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
    expect(router).toContain("FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1");
    expect(router).toContain("crmp.financialShift.");
    expect(router).not.toMatch(/computeExpectedCash|grandTotal|toCents/);
    const svc = read("server/crmp/api/crmpRegisterOperationsService.ts");
    expect(svc).not.toMatch(/computeExpectedCash|grandTotal|toCents/);
    const shiftSvc = read(
      "server/crmp/api/crmpFinancialShiftOperationsService.ts"
    );
    expect(shiftSvc).toContain("getExpectedCash");
    expect(shiftSvc).toContain("closeWithFinalCount");
    expect(shiftSvc).not.toMatch(/recordCount\s*\(/);
    expect(shiftSvc).not.toMatch(/computeExpectedCash|grandTotal|toCents/);
    expect(shiftSvc).not.toMatch(/openRegister|closeRegister/);
  });

  it("Register domain open does not open Financial Shift", () => {
    const registerSvc = read("server/crmp/RegisterDomainService.ts");
    expect(registerSvc).not.toContain("openFinancialShift");
    expect(registerSvc).not.toContain("FinancialShiftDomainService");
  });

  it("Shift tender summary adopts Settlement + Reporting rules without Expected Cash changes", () => {
    const tender = read("server/crmp/api/crmpFinancialShiftTenderSummary.ts");
    const expected = read("shared/crmp/financialShift/expectedCash.ts");
    expect(tender).toContain("FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1");
    expect(tender).toContain("buildPaymentMethodAnalyticsFromCapturedLines");
    expect(tender).toContain("listSettlementRecordsByIds");
    expect(tender).not.toMatch(/computeExpectedCash\s*\(/);
    expect(tender).toContain("Does NOT invoke the Expected Cash formula");
    expect(expected).toContain("Σ attributed cash tender amounts");
    expect(expected).toContain("Never uses Order totals");
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

  it("migration 0080 is additive Register Catalog only", () => {
    const sql = read("drizzle/0080_crmp_register_catalog.sql");
    expect(sql).toContain("crmp_registers");
    expect(sql).toContain("`code`");
    expect(sql).toContain("registerType");
    expect(sql).toContain("archivedAt");
    const shiftNumberSql = read("drizzle/0081_crmp_financial_shift_number.sql");
    expect(shiftNumberSql).toContain("FINANCIAL-SHIFT-RETENTION-ADOPTION-1");
    expect(shiftNumberSql).toContain("shiftNumber");
    expect(shiftNumberSql).toContain("crmp_register_shift_sequences");
    expect(sql).toContain("crmp_registers_restaurant_code_unique");
    expect(sql).not.toMatch(/operational_checks/);
    expect(sql).not.toMatch(/settlement_records/);
    expect(sql).not.toMatch(/crmp_financial_shifts/);
    expect(sql).not.toMatch(/DROP TABLE/);
  });

  it("schema exports ADR-030 shift statuses, Duty, and Catalog fields", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("crmpRegisters");
    expect(schema).toContain("suspended");
    expect(schema).toContain("closing");
    expect(schema).toContain("archived");
    expect(schema).toContain("SHIFT-LIFECYCLE-IMPLEMENTATION-1");
    expect(schema).toContain("REGISTER-OPERATIONS-IMPLEMENTATION-1");
    expect(schema).toContain("REGISTER-CATALOG-MANAGEMENT-1");
    expect(schema).toContain("dutyStatus");
    expect(schema).toContain("assignedOperatorUserId");
    expect(schema).toContain("registerType");
    expect(schema).toContain("settlement_station");
  });

  it("journal includes 0077–0080", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0077_crmp");
    expect(journal).toContain("0078_crmp_shift_lifecycle");
    expect(journal).toContain("0079_crmp_register_duty");
    expect(journal).toContain("0080_crmp_register_catalog");
  });

  it("catalog API façade stays thin and separate from Duty", () => {
    const router = read("server/crmp/api/crmpRouter.ts");
    expect(router).toContain("crmp.catalog.");
    expect(router).toContain("getCrmpRegisterCatalogService");
    const catalog = read("server/crmp/api/crmpRegisterCatalogService.ts");
    expect(catalog).not.toMatch(/openRegister|closeRegister|suspendRegister/);
    expect(catalog).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
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

  it("register close corridor is retry-safe and isolated from Cashier PAID", () => {
    const ops = read("server/crmp/api/crmpFinancialShiftOperationsService.ts");
    const domain = read("server/crmp/FinancialShiftDomainService.ts");
    const panel = read(
      "client/src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    const cashier = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const errors = read(
      "client/src/lib/register-operations-presentation/registerOperationsErrorPresentation.ts"
    );
    expect(domain).toContain("closeWithFinalCount");
    expect(domain).toContain("commitCloseCorridor");
    expect(ops).toContain("closeIdempotencyKey");
    expect(ops).not.toMatch(/pos\.sale|commitCashierProductionCollectionFact/);
    expect(panel).toContain("closeDuty: true");
    expect(panel).toContain("closeIdempotencyKey");
    expect(panel).toContain("readOrCreateRegisterCloseAttemptKey");
    expect(errors).toContain("stale_version");
    expect(errors).toContain("final_count_conflict");
    expect(errors).toContain("duty_blocked");
    expect(cashier).not.toContain("trpc.crmp.financialShift.close");
    expect(cashier).not.toContain("closeWithFinalCount");
  });

  it("financial shift create does not upsert headers and opens atomically", () => {
    const repo = read("server/crmp/DrizzleCrmpRepository.ts");
    const domain = read("server/crmp/FinancialShiftDomainService.ts");
    const persistStart = repo.indexOf("async function persistShiftGraph");
    const persistEnd = repo.indexOf("async function allocateNextShiftNumberOn");
    const persist = repo.slice(persistStart, persistEnd);
    expect(persist).not.toContain("onDuplicateKeyUpdate");
    expect(repo).toContain("commitOpenShift");
    expect(repo).toContain("GREATEST(lastNumber");
    const allocate = repo.slice(persistEnd);
    expect(allocate).not.toContain("|| 1");
    expect(allocate).not.toContain("onDuplicateKeyUpdate");
    expect(domain).toContain("commitOpenShift");
    expect(domain).toContain("closeDuty");
  });
});
