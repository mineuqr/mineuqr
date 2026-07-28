/**
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1", () => {
  it("exports SemanticSurfaceCard and domain / cardType / icon tokens", () => {
    const barrel = read("client/src/design-system/semantic-card/index.ts");
    expect(barrel).toContain("SemanticSurfaceCard");
    expect(barrel).toContain("SEMANTIC_DOMAIN_HEX");
    expect(barrel).toContain("SEMANTIC_DOMAIN_SURFACE");
    expect(barrel).toContain("semanticCardTypeClass");
    expect(barrel).toContain("SEMANTIC_ICON");
    expect(
      existsSync(
        resolve(
          root,
          "client/src/design-system/semantic-card/components/SemanticSurfaceCard.tsx"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        resolve(root, "client/src/design-system/semantic-card/tokens/domain.ts")
      )
    ).toBe(true);
    expect(
      existsSync(
        resolve(root, "client/src/design-system/semantic-card/tokens/cardType.ts")
      )
    ).toBe(true);
    expect(
      existsSync(
        resolve(root, "client/src/design-system/semantic-card/tokens/icon.ts")
      )
    ).toBe(true);
  });

  it("Dashboard settings Cards use dash.card (not bg-card border-border)", () => {
    const src = read("client/src/pages/Dashboard.tsx");
    expect(src).not.toMatch(/<Card className="bg-card border-border"/);
    expect(src).not.toContain("cinematic-card");
    expect(src).toContain("dash.card");
  });

  it("print workspace Cards use semantic panel / cardType shells", () => {
    const printer = read(
      "client/src/components/print-workspace/CurrentPrinterCard.tsx"
    );
    const local = read(
      "client/src/components/print-workspace/LocalConnectorCard.tsx"
    );
    const session = read(
      "client/src/components/print-workspace/ConnectorSessionCard.tsx"
    );
    expect(printer).toContain("semanticCardTypeClass");
    expect(printer).not.toContain("border-slate-800 bg-slate-900/40");
    expect(local).toContain("semanticCardTypeClass");
    expect(session).toContain("semanticPanel.inset");
  });

  it("register summary Cards use domain / category surfaces", () => {
    const cash = read(
      "client/src/components/register-operations/CashDrawerSummaryCard.tsx"
    );
    const tender = read(
      "client/src/components/register-operations/FinancialShiftTenderSummaryCard.tsx"
    );
    expect(cash).toContain('domain: "payments"');
    expect(cash).not.toContain("border-emerald-500/25 bg-emerald-950/15");
    expect(tender).toContain("SEMANTIC_CATEGORY_SURFACE.card");
    expect(tender).not.toContain("border-sky-500/25 bg-sky-950/15");
  });

  it("ops / fleet / kitchen tickets inherit SEMANTIC_PANEL_BASE", () => {
    const kitchen = read(
      "client/src/components/kitchen/KitchenExecutionCard.tsx"
    );
    const ops = read(
      "client/src/components/operational-workspace/OperationalCard.tsx"
    );
    const fleet = read(
      "client/src/components/screen-management/FleetScreenCard.tsx"
    );
    expect(kitchen).toContain("SEMANTIC_PANEL_BASE");
    expect(kitchen).not.toContain("shadow-[0_1px_2px");
    expect(ops).toContain("SEMANTIC_PANEL_BASE");
    expect(ops).not.toContain("shadow-sm transition-all");
    expect(fleet).toContain("SEMANTIC_PANEL_BASE");
    expect(fleet).toContain("SEMANTIC_TONE.row");
  });

  it("restaurantDash and adminDash icon containers facade to SEMANTIC_ICON", () => {
    const restaurant = read(
      "client/src/components/dashboard/restaurantDashStyles.ts"
    );
    const admin = read(
      "client/src/components/admin/layout/adminDashStyles.ts"
    );
    expect(restaurant).toContain("SEMANTIC_ICON.md");
    expect(admin).toContain("SEMANTIC_ICON.md");
  });

  it("About / Template / customizers no longer use cinematic-card class", () => {
    for (const rel of [
      "client/src/pages/About.tsx",
      "client/src/pages/TemplateSelector.tsx",
      "client/src/components/FontCustomizer.tsx",
      "client/src/components/ColorCustomizer.tsx",
    ]) {
      const src = read(rel);
      expect(src).not.toContain("cinematic-card");
      expect(src).toContain("landing-card");
    }
  });
});
