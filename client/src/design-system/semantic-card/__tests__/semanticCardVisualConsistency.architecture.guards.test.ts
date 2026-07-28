/**
 * SEMANTIC-CARD-VISUAL-CONSISTENCY-1 — architecture guards.
 * Reporting is the golden visual reference for SemanticKpiCard / SemanticExecutiveCard.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SEMANTIC_KPI_GRID,
  semanticPanel,
} from "@/design-system/semantic-card";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("SEMANTIC-CARD-VISUAL-CONSISTENCY-1", () => {
  it("KPI panel shells neutralize shadcn Card py/gap defaults", () => {
    expect(semanticPanel.kpi).toContain("gap-0");
    expect(semanticPanel.kpi).toContain("py-0");
    expect(semanticPanel.kpiPrimary).toContain("gap-0");
    expect(semanticPanel.kpiSupporting).toContain("gap-0");
  });

  it("restaurantDash KPI grids are facades of SEMANTIC_KPI_GRID", () => {
    expect(restaurantDash.kpiGrid).toBe(SEMANTIC_KPI_GRID.dense);
    expect(restaurantDash.kpiGridSecondary).toBe(SEMANTIC_KPI_GRID.secondary);
    expect(restaurantDash.kpiGridSupporting).toBe(SEMANTIC_KPI_GRID.supporting);
    expect(restaurantDash.kpiGridQuad).toBe(SEMANTIC_KPI_GRID.quad);
    expect(restaurantDash.kpiGridTrio).toBe(SEMANTIC_KPI_GRID.trio);
  });

  it("SemanticKpiCard compact aliases secondary (no separate chrome)", () => {
    const src = read(
      "client/src/design-system/semantic-card/components/SemanticKpiCard.tsx"
    );
    expect(src).toContain('if (emphasis === "compact") return "secondary"');
    expect(src).not.toContain("valueClassName");
  });

  it("SemanticExecutiveGrid uses SEMANTIC_KPI_GRID.executive", () => {
    const src = read(
      "client/src/design-system/semantic-card/components/SemanticExecutiveCard.tsx"
    );
    expect(src).toContain("SEMANTIC_KPI_GRID.executive");
  });

  it("admin ReportsHome and SecurityOverview do not use compact emphasis", () => {
    expect(
      read("client/src/components/admin/domains/reports/ReportsHomeKpiSection.tsx")
    ).not.toContain('emphasis="compact"');
    expect(
      read("client/src/components/admin/domains/security/SecurityOverviewSection.tsx")
    ).not.toContain('emphasis="compact"');
  });

  it("workspace shell uses quad KPI grid (not dense 5-col for 4 metrics)", () => {
    const src = read(
      "client/src/components/operational-workspace/OperationalWorkspaceShell.tsx"
    );
    expect(src).toContain("kpiGridQuad");
  });

  it("PaymentMethodAnalysis uses secondary grid for pair KPIs", () => {
    const src = read(
      "client/src/components/dashboard/PaymentMethodAnalysisSection.tsx"
    );
    expect(src).toContain("kpiGridSecondary");
  });

  it("SalesSourceAnalysis uses SemanticKpiCard", () => {
    const src = read(
      "client/src/components/dashboard/SalesSourceAnalysisSection.tsx"
    );
    expect(src).toContain("SemanticKpiCard");
    expect(src).not.toContain("text-orange-200");
  });

  it("Commercial subscription health uses SemanticKpiCard", () => {
    const src = read(
      "client/src/components/admin/commercial/CommercialOverviewSubscriptionHealth.tsx"
    );
    expect(src).toContain("SemanticKpiCard");
    expect(src).toContain("SEMANTIC_KPI_GRID.dense");
    expect(src).not.toContain("adminSemantic.cardAccent");
  });

  it("OperationalSnapshot does not use legacy tone primary", () => {
    const src = read(
      "client/src/components/dashboard/OperationalSnapshotSection.tsx"
    );
    expect(src).not.toContain('tone="primary"');
  });
});
