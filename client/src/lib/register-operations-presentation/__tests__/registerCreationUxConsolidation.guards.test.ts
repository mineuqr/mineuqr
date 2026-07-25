/**
 * REGISTER-CREATION-UX-CONSOLIDATION-1 — navigation + embed guards.
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Register creation UX consolidation", () => {
  it("removes Register Catalog from the workspace sidebar", () => {
    const sidebar = read(
      "src/components/dashboard/layout/RestaurantDashboardSidebar.tsx"
    );
    expect(sidebar).toContain("REGISTER-CREATION-UX-CONSOLIDATION-1");
    expect(sidebar).toContain('id: "register"');
    expect(sidebar).not.toContain('id: "register-catalog"');
    expect(sidebar).not.toContain("كتالوج الصناديق");
    expect(sidebar).not.toContain("BookMarked");
  });

  it("embeds shared RegisterCatalogForm via CreateRegisterDialog in Ops", () => {
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    const dialog = read(
      "src/components/register-operations/CreateRegisterDialog.tsx"
    );
    const form = read(
      "src/components/register-catalog/RegisterCatalogForm.tsx"
    );
    const catalog = read(
      "src/components/register-catalog/RegisterCatalogPanel.tsx"
    );

    expect(panel).toContain("REGISTER-CREATION-UX-CONSOLIDATION-1");
    expect(panel).toContain("CreateRegisterDialog");
    expect(panel).toContain("createRegister");
    expect(panel).not.toContain("manageRegisters");
    expect(panel).not.toContain("trpc.crmp.catalog");

    expect(dialog).toContain("RegisterCatalogForm");
    expect(dialog).toContain("createDialogTitle");

    expect(form).toContain("REGISTER-CREATION-UX-CONSOLIDATION-1");
    expect(form).toContain("useRegisterCatalogMutations");
    expect(form).toContain("mutations.create.mutateAsync");

    expect(catalog).toContain("RegisterCatalogForm");
    expect(catalog.match(/RegisterCatalogForm/g)?.length).toBeGreaterThanOrEqual(
      2
    );
  });

  it("empty-state copy matches consolidated create wording", () => {
    const copy = read(
      "src/lib/register-operations-presentation/registerOperationsCopy.ts"
    );
    expect(copy).toContain("لا يوجد صندوق لهذا الفرع.");
    expect(copy).toContain("للبدء بعمليات الصندوق قم بإنشاء أول صندوق.");
    expect(copy).toContain("إنشاء صندوق");
    expect(copy).not.toContain("إدارة الصناديق");
    expect(copy).not.toContain("كتالوج الصناديق");
    expect(copy).not.toContain("سيتم فتح كتالوج الصناديق");
  });
});
