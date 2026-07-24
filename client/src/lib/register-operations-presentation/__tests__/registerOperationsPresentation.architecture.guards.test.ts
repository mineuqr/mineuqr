/**
 * REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 / REGISTER-CATALOG-MANAGEMENT-1 —
 * architecture guards for Register Operations presentation.
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

  it("Ops panel stays presentation-only; create navigates to Catalog", () => {
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(panel).toContain("REGISTER-CATALOG-MANAGEMENT-1");
    expect(panel).toContain("section=register-catalog&create=1");
    expect(panel).toContain("spaNavigate");
    expect(panel).not.toMatch(/from ["']@shared\/crmp/);
    expect(panel).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
    expect(panel).not.toContain("trpc.crmp.catalog");
  });

  it("dashboard wires register + register-catalog sections", () => {
    const url = read("src/lib/dashboardUrl.ts");
    const types = read("src/components/dashboard/layout/types.ts");
    expect(url).toContain('register: "register"');
    expect(url).toContain('"register-catalog": "register-catalog"');
    expect(types).toContain('"register"');
    expect(types).toContain('"register-catalog"');
    expect(url).toContain('new Set<RestaurantTab>(["sessions"])');
  });

  it("empty-state copy keeps create CTA wording", () => {
    const copy = read(
      "src/lib/register-operations-presentation/registerOperationsCopy.ts"
    );
    expect(copy).toContain("لا يوجد أي صندوق تشغيل");
    expect(copy).toContain("ابدأ بإنشاء أول صندوق تشغيل لهذا الفرع.");
    expect(copy).toContain("إنشاء صندوق");
    expect(copy).toContain("واجهة محسّنة للأجهزة اللوحية ونقاط البيع.");
  });
});
