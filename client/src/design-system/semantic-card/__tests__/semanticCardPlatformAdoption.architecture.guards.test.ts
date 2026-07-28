/**
 * SEMANTIC-CARD-PLATFORM-ADOPTION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("SEMANTIC-CARD-PLATFORM-ADOPTION-1", () => {
  it("legacy RestaurantKpiCard and AdminStatCard files are removed", () => {
    expect(
      existsSync(
        resolve(root, "client/src/components/dashboard/RestaurantKpiCard.tsx")
      )
    ).toBe(false);
    expect(
      existsSync(
        resolve(root, "client/src/components/admin/layout/AdminStatCard.tsx")
      )
    ).toBe(false);
  });

  it("SessionsWorkspacePanel uses SemanticKpiCard", () => {
    const src = read(
      "client/src/components/dashboard/SessionsWorkspacePanel.tsx"
    );
    expect(src).toContain("SemanticKpiCard");
    expect(src).not.toContain("RestaurantKpiCard");
  });

  it("AdminKPISection uses SemanticKpiCard", () => {
    const src = read("client/src/components/admin/layout/AdminKPISection.tsx");
    expect(src).toContain("SemanticKpiCard");
    expect(src).not.toContain("AdminStatCard");
  });

  it("DiningSessionSummaryCard uses SemanticBadge + SemanticKpiCard", () => {
    const src = read(
      "client/src/components/dashboard/DiningSessionSummaryCard.tsx"
    );
    expect(src).toContain("SemanticBadge");
    expect(src).toContain("SemanticKpiCard");
    expect(src).not.toContain('from "@/components/ui/badge"');
  });

  it("CommercialOverviewNeedsAttention has no local amber/red card maps", () => {
    const src = read(
      "client/src/components/admin/commercial/CommercialOverviewNeedsAttention.tsx"
    );
    expect(src).toContain("SemanticKpiCard");
    expect(src).not.toContain("border-amber-500/30");
    expect(src).not.toContain("AttentionCard");
  });

  it("ExecutivePeriodDashboard delegates to SemanticExecutive*", () => {
    const src = read(
      "client/src/components/dashboard/ExecutivePeriodDashboard.tsx"
    );
    expect(src).toContain("SemanticExecutiveCard");
    expect(src).toContain("SemanticExecutiveGrid");
    expect(src).not.toContain("const CATEGORY_STYLE");
  });
});
