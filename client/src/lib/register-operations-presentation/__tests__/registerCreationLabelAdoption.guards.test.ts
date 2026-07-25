/**
 * REGISTER-CREATION-LABEL-ADOPTION-1 — user-facing terminology guards.
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Register creation label adoption", () => {
  it("forbids user-facing Catalog / Manage register entry labels", () => {
    const opsCopy = read(
      "src/lib/register-operations-presentation/registerOperationsCopy.ts"
    );
    const catalogCopy = read(
      "src/lib/register-catalog-presentation/registerCatalogCopy.ts"
    );
    const dashboard = read("src/pages/Dashboard.tsx");
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    const sidebar = read(
      "src/components/dashboard/layout/RestaurantDashboardSidebar.tsx"
    );

    for (const src of [opsCopy, catalogCopy, dashboard, panel, sidebar]) {
      expect(src).not.toContain("كتالوج الصناديق");
      expect(src).not.toContain("إدارة الصناديق");
      expect(src).not.toContain("Manage registers");
      expect(src).not.toContain("Register Catalog");
    }

    expect(panel).not.toContain("manageRegisters");
    expect(opsCopy).not.toContain("manageRegisters");
  });

  it("exposes Create register as the visible Ops entry", () => {
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    const opsCopy = read(
      "src/lib/register-operations-presentation/registerOperationsCopy.ts"
    );
    const catalogCopy = read(
      "src/lib/register-catalog-presentation/registerCatalogCopy.ts"
    );

    expect(panel).toContain("REGISTER-CREATION-LABEL-ADOPTION-1");
    expect(panel).toContain('registerOperationsUiLabel("createRegister"');
    expect(panel).toContain("<Plus");
    expect(panel).toContain('registerOperationsUiLabel("refresh"');
    expect(opsCopy).toContain('createRegister: { ar: "إنشاء صندوق"');
    expect(catalogCopy).toContain('title: { ar: "إنشاء صندوق"');
  });
});
