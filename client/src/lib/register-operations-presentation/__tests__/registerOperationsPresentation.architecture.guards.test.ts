/**
 * REGISTER-OPERATIONS-SIMPLIFICATION-1 — architecture guards.
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
  it("Duty presentation still calls only crmp.register.*", () => {
    const q = read(
      "src/lib/register-operations-presentation/useRegisterOperationsQueries.ts"
    );
    const m = read(
      "src/lib/register-operations-presentation/useRegisterOperationsMutations.ts"
    );
    expect(q).toContain("trpc.crmp.register");
    expect(m).toContain("trpc.crmp.register");
    expect(q + m).not.toMatch(/trpc\.crmp\.catalog/);
    expect(q + m).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
  });

  it("Ops panel is presentation-only adaptive simplification", () => {
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(panel).toContain("REGISTER-OPERATIONS-SIMPLIFICATION-1");
    expect(panel).toContain("resolveRegisterOpsLayoutMode");
    expect(panel).toContain("presentFriendlyOperator");
    expect(panel).toContain("presentFriendlyDevice");
    expect(panel).toContain("section=register-catalog");
    expect(panel).not.toMatch(/from ["']@shared\/crmp/);
    expect(panel).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
    expect(panel).not.toContain("trpc.crmp.catalog");
    expect(panel).not.toContain('registerOperationsUiLabel("operatorUserId"');
    expect(panel).not.toContain('registerOperationsUiLabel("deviceId"');
    expect(panel).not.toContain("assignOperator");
    expect(panel).not.toContain("attachDevice");
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
