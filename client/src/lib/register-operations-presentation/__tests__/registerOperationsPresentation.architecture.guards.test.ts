/**
 * REGISTER-OPERATIONS-SIMPLIFICATION-1 /
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — architecture guards.
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Register Operations presentation architecture guards", () => {
  it("Duty presentation still calls crmp.register.*; Shift hooks are separate", () => {
    const q = read(
      "src/lib/register-operations-presentation/useRegisterOperationsQueries.ts"
    );
    const m = read(
      "src/lib/register-operations-presentation/useRegisterOperationsMutations.ts"
    );
    const shiftM = read(
      "src/lib/register-operations-presentation/useFinancialShiftMutations.ts"
    );
    expect(q).toContain("trpc.crmp.register");
    expect(m).toContain("trpc.crmp.register");
    expect(m).not.toMatch(/trpc\.crmp\.financialShift\.open/);
    expect(shiftM).toContain("trpc.crmp.financialShift.open");
    expect(shiftM).toContain("trpc.crmp.financialShift.close");
    expect(q + m + shiftM).not.toMatch(/trpc\.crmp\.catalog/);
    expect(q + m + shiftM).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
  });

  it("Ops panel is presentation-only adaptive simplification + Shift workflow", () => {
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(panel).toContain("REGISTER-OPERATIONS-SIMPLIFICATION-1");
    expect(panel).toContain("FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1");
    expect(panel).toContain("FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1");
    expect(panel).toContain("resolveRegisterOpsLayoutMode");
    expect(panel).toContain("presentFriendlyOperator");
    expect(panel).toContain("presentFriendlyDevice");
    expect(panel).toContain("needsOpeningFloatPrompt");
    expect(panel).toContain("OpeningFloatDialog");
    expect(panel).toContain("ShiftClosingSummaryDialog");
    expect(panel).toContain("CashDrawerSummaryCard");
    expect(panel).toContain("FinancialShiftTenderSummaryCard");
    expect(panel).toContain("FINANCIAL-SHIFT-CLOSING-PRESENTATION-1");
    expect(panel).toContain("FINANCIAL-SHIFT-CLOSING-UX-REFINEMENT-1");
    expect(panel).toContain("overflow-x-hidden");
    expect(panel).toContain("section=register-catalog");
    expect(panel).not.toMatch(/from ["']@shared\/crmp/);
    expect(panel).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
    expect(panel).not.toContain("trpc.crmp.catalog");
    expect(panel).not.toContain('registerOperationsUiLabel("operatorUserId"');
    expect(panel).not.toContain('registerOperationsUiLabel("deviceId"');
    expect(panel).not.toContain("assignOperator");
    expect(panel).not.toContain("attachDevice");
  });

  it("tender summary presentation groups Ops rows without Domain/API changes", () => {
    const present = read(
      "src/lib/register-operations-presentation/financialShiftTenderSummaryPresentation.ts"
    );
    expect(present).toContain("FINANCIAL-SHIFT-TENDER-PRESENTATION-REFINEMENT-1");
    expect(present).toContain("presentTenderSummaryRows");
    expect(present).toContain("OPS_NETWORK_BANK_METHODS");
    expect(present).toContain("tenderNetworkBank");
    expect(present).not.toMatch(/toCents|computeExpectedCash|openFinancialShift/);
    expect(present).not.toContain("trpc.");
    expect(present).not.toMatch(/from ["']@shared\/crmp/);
  });

  it("Register.open remains independent of FinancialShift.open in domain service", () => {
    const registerSvc = read("../server/crmp/RegisterDomainService.ts");
    expect(registerSvc).not.toContain("openFinancialShift");
    expect(registerSvc).not.toContain("FinancialShiftDomainService");
  });

  it("adaptive helpers do not import domain", () => {
    const adaptive = read(
      "src/lib/register-operations-presentation/registerOperationsAdaptive.ts"
    );
    expect(adaptive).not.toMatch(/from ["']@shared\/crmp/);
    expect(adaptive).not.toContain("openRegister");
    expect(adaptive).not.toContain("provisionRegister");
  });

  it("dashboard wires register + register-catalog sections", () => {
    const url = read("src/lib/dashboardUrl.ts");
    const types = read("src/components/dashboard/layout/types.ts");
    expect(url).toContain('register: "register"');
    expect(url).toContain('"register-catalog": "register-catalog"');
    expect(types).toContain('"register"');
    expect(types).toContain('"register-catalog"');
  });

  it("empty-state copy keeps create and activate guidance", () => {
    const copy = read(
      "src/lib/register-operations-presentation/registerOperationsCopy.ts"
    );
    expect(copy).toContain("لا يوجد أي صندوق تشغيل");
    expect(copy).toContain("لا يوجد صندوق نشط");
    expect(copy).toContain("إنشاء صندوق");
    expect(copy).toContain("قم بتفعيل صندوق من كتالوج الصناديق.");
  });
});
