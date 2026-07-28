/**
 * REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1 — architecture guards.
 * Reporting SEMANTIC_CATEGORY_SURFACE is the SSOT recipe for domain business cards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DOMAIN_TO_REPORTING_CATEGORY,
  SEMANTIC_CATEGORY_SURFACE,
  SEMANTIC_DOMAIN_SURFACE,
  semanticDomainReportingSurfaceClass,
} from "@/design-system/semantic-card";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1", () => {
  it("maps mapped domains to Reporting category shells verbatim", () => {
    expect(DOMAIN_TO_REPORTING_CATEGORY.payments).toBe("cash");
    expect(DOMAIN_TO_REPORTING_CATEGORY.revenue).toBe("cash");
    expect(DOMAIN_TO_REPORTING_CATEGORY.orders).toBe("card");
    expect(DOMAIN_TO_REPORTING_CATEGORY.kitchen).toBe("tax");
    expect(DOMAIN_TO_REPORTING_CATEGORY.growth).toBe("net");
    expect(DOMAIN_TO_REPORTING_CATEGORY.danger).toBe("refund");

    expect(SEMANTIC_DOMAIN_SURFACE.payments.shell).toBe(
      SEMANTIC_CATEGORY_SURFACE.cash.shell
    );
    expect(SEMANTIC_DOMAIN_SURFACE.orders.shell).toBe(
      SEMANTIC_CATEGORY_SURFACE.card.shell
    );
    expect(SEMANTIC_DOMAIN_SURFACE.kitchen.shell).toBe(
      SEMANTIC_CATEGORY_SURFACE.tax.shell
    );
    expect(SEMANTIC_DOMAIN_SURFACE.kitchen.glow).toBe(
      SEMANTIC_CATEGORY_SURFACE.tax.glow
    );
    expect(SEMANTIC_DOMAIN_SURFACE.growth.shell).not.toContain("col-span");
    expect(SEMANTIC_DOMAIN_SURFACE.growth.shell).toContain("from-teal-950");
  });

  it("Reporting surface helper returns tinted shell + glow", () => {
    const cls = semanticDomainReportingSurfaceClass("payments");
    expect(cls).toContain("bg-gradient-to-b");
    expect(cls).toContain("from-emerald-950");
    expect(cls).toContain("border-emerald");
    expect(cls).toContain("hover:shadow-");
  });

  it("exports DOMAIN_TO_REPORTING_CATEGORY and surface helper from barrel", () => {
    const barrel = read("client/src/design-system/semantic-card/index.ts");
    expect(barrel).toContain("DOMAIN_TO_REPORTING_CATEGORY");
    expect(barrel).toContain("semanticDomainReportingSurfaceClass");
  });

  it("SemanticKpiCard domain path uses Reporting surface (not accent-only)", () => {
    const src = read(
      "client/src/design-system/semantic-card/components/SemanticKpiCard.tsx"
    );
    expect(src).toContain("semanticDomainReportingSurfaceClass");
    expect(src).not.toContain("semanticDomainAccentClass");
    expect(src).toContain("REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1");
  });

  it("cardType domain path replaces cyan panel base", () => {
    const src = read(
      "client/src/design-system/semantic-card/tokens/cardType.ts"
    );
    expect(src).toContain("domainSurface ?? SEMANTIC_PANEL_BASE");
    expect(src).toContain("REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1");
  });

  it("ops / register / board business cards consume Reporting surfaces", () => {
    expect(read("client/src/components/kitchen/KitchenExecutionCard.tsx")).toContain(
      'domain="kitchen"'
    );
    expect(
      read("client/src/components/operational-workspace/OperationalCard.tsx")
    ).toContain('domain="orders"');
    expect(
      read("client/src/design-system/operational-order-card/components/OperationalOrderCard.tsx")
    ).toContain("semanticDomainReportingSurfaceClass");
    expect(
      read("client/src/components/dashboard/OperationalBoardCard.tsx")
    ).toContain('semanticDomainReportingSurfaceClass("orders")');
    expect(
      read("client/src/components/screen-management/FleetScreenCard.tsx")
    ).toContain('semanticDomainReportingSurfaceClass("analytics")');
    expect(
      read("client/src/components/register-operations/FinancialShiftTenderSummaryCard.tsx")
    ).toContain('semanticDomainReportingSurfaceClass("orders")');
    expect(
      read("client/src/components/register-operations/ShiftClosingSummaryDialog.tsx")
    ).toContain('semanticDomainReportingSurfaceClass("payments")');
    expect(
      read("client/src/components/register-operations/CashDrawerSummaryCard.tsx")
    ).toContain('domain: "payments"');
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1";
    for (const name of ["AUDIT.md", "IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
