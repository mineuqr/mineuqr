/**
 * REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 — architecture guards.
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 architecture guards", () => {
  it("presentation still calls only crmp.register.*", () => {
    const q = read(
      "src/lib/register-operations-presentation/useRegisterOperationsQueries.ts"
    );
    const m = read(
      "src/lib/register-operations-presentation/useRegisterOperationsMutations.ts"
    );
    expect(q).toContain("trpc.crmp.register");
    expect(m).toContain("trpc.crmp.register");
    expect(q + m).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
  });

  it("panel is presentation-only and keeps create CTA disabled without new APIs", () => {
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(panel).toContain("UX-REFINEMENT-1");
    expect(panel).toContain("createRegisterDisabledHint");
    expect(panel).toMatch(/disabled[\s\S]*createRegister|createRegister[\s\S]*disabled/);
    expect(panel).not.toMatch(/from ["']@shared\/crmp/);
    expect(panel).not.toMatch(/computeExpectedCash|toCents|grandTotal/);
    expect(panel).not.toContain("spaNavigate");
    expect(panel).not.toContain("buildDashboardPath");
  });

  it("does not change routing or dashboard section wiring beyond existing register tab", () => {
    const url = read("src/lib/dashboardUrl.ts");
    const types = read("src/components/dashboard/layout/types.ts");
    expect(url).toContain('register: "register"');
    expect(types).toContain('"register"');
    // register stays query-section only — not a PATH_ROUTE_TABS member
    expect(url).toContain('new Set<RestaurantTab>(["sessions"])');
  });

  it("empty-state copy matches refinement requirements", () => {
    const copy = read(
      "src/lib/register-operations-presentation/registerOperationsCopy.ts"
    );
    expect(copy).toContain("لا يوجد أي صندوق تشغيل");
    expect(copy).toContain("ابدأ بإنشاء أول صندوق تشغيل لهذا الفرع.");
    expect(copy).toContain("إنشاء صندوق");
    expect(copy).toContain("واجهة محسّنة للأجهزة اللوحية ونقاط البيع.");
  });
});
