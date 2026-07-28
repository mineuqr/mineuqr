/**
 * TABLE-PLATFORM-ADOPTION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  SEMANTIC_TABLE,
  semanticTableClass,
} from "@/design-system/semantic-table";
import { adminDash } from "@/components/admin/layout/adminDashStyles";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

const ELIGIBLE_TABLES = [
  "client/src/components/admin/domains/customer-success/CustomerSuccessAccountsSection.tsx",
  "client/src/components/admin/domains/customer-success/CustomerSuccessTenantsSection.tsx",
  "client/src/components/admin/domains/security/SecurityAuditTimelineSection.tsx",
  "client/src/components/admin/domains/security/SecurityRoleChangesSection.tsx",
  "client/src/components/admin/domains/security/SecuritySubscriptionChangesSection.tsx",
  "client/src/components/settlement-record/SettlementHistoryPanel.tsx",
  "client/src/components/dashboard/PaymentMethodAnalysisSection.tsx",
  "client/src/components/dashboard/RefundAnalyticsSection.tsx",
  "client/src/pages/PaymentHistory.tsx",
  "client/src/pages/admin/StatisticsPanel.tsx",
  "client/src/components/commercial/CommercialVisibilityDiagnostics.tsx",
  "client/src/components/commercial/CommercialGateConsolidationDiagnostics.tsx",
] as const;

const EXCLUDED = [
  "client/src/components/screen-management/VirtualizedFleetTable.tsx",
  "client/src/components/RestaurantSettingsSections.tsx",
] as const;

describe("TABLE-PLATFORM-ADOPTION-1", () => {
  it("semantic-table package exports canonical surface tokens", () => {
    expect(SEMANTIC_TABLE.opsTable).toContain("table-fixed");
    expect(SEMANTIC_TABLE.desktop).toBe("hidden lg:block");
    expect(SEMANTIC_TABLE.mobile).toBe("lg:hidden");
    expect(semanticTableClass("ledger")).toBe(SEMANTIC_TABLE.ledgerTable);
  });

  it("adminDash opsTable tokens are facades of SEMANTIC_TABLE", () => {
    expect(adminDash.opsTable).toBe(SEMANTIC_TABLE.opsTable);
    expect(adminDash.opsTableWrap).toBe(SEMANTIC_TABLE.desktop);
    expect(adminDash.opsTableHead).toBe(SEMANTIC_TABLE.opsHead);
    expect(adminDash.opsTableCell).toBe(SEMANTIC_TABLE.opsCell);
  });

  it("design-system barrel exports semantic-table", () => {
    const barrel = read("client/src/design-system/index.ts");
    expect(barrel).toContain('"./semantic-table"');
  });

  it("every eligible table imports SemanticTableRoot", () => {
    for (const rel of ELIGIBLE_TABLES) {
      const src = read(rel);
      expect(src, rel).toContain("SemanticTableRoot");
      expect(src, rel).toContain("@/design-system/semantic-table");
    }
  });

  it("PaymentHistory has no local getStatusColor map", () => {
    const src = read("client/src/pages/PaymentHistory.tsx");
    expect(src).not.toContain("getStatusColor");
    expect(src).toContain("SemanticBadge");
    expect(src).toContain("mapInvoiceStatusToBadgeTone");
  });

  it("SecurityAuditTimeline uses SemanticBadge for severity", () => {
    const src = read(
      "client/src/components/admin/domains/security/SecurityAuditTimelineSection.tsx"
    );
    expect(src).toContain("SemanticBadge");
    expect(src).toContain("mapAuditSeverityToBadgeTone");
    expect(src).not.toContain("auditSeverityClass");
  });

  it("auditSeverityClass local color helper is removed", () => {
    const src = read(
      "client/src/components/admin/domains/security/auditEventDisplay.ts"
    );
    expect(src).not.toContain("auditSeverityClass");
    expect(src).not.toContain("border-red-500/30 bg-red-500/10");
  });

  it("SettlementHistory uses SemanticBadge + standardized states", () => {
    const src = read(
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx"
    );
    expect(src).toContain("SemanticBadge");
    expect(src).toContain("mapSettlementStatusToBadgeTone");
    expect(src).toContain("SemanticTableEmptyState");
    expect(src).toContain("SemanticTableLoadingState");
    expect(src).toContain("SemanticTableErrorState");
    expect(src).toContain("SemanticTablePagination");
  });

  it("ui/table is a semantic-table facade", () => {
    const src = read("client/src/components/ui/table.tsx");
    expect(src).toContain("TABLE-PLATFORM-ADOPTION-1");
    expect(src).toContain("@/design-system/semantic-table");
    expect(src).toContain("SemanticTableRoot");
  });

  it("excluded domain surfaces remain outside forced SemanticTable migration", () => {
    for (const rel of EXCLUDED) {
      expect(existsSync(resolve(root, rel)), rel).toBe(true);
      const src = read(rel);
      expect(src, rel).not.toContain("SemanticTableRoot");
    }
  });

  it("GateTable uses SemanticBadge not ui Badge variants for status", () => {
    const src = read(
      "client/src/components/commercial/CommercialGateConsolidationDiagnostics.tsx"
    );
    expect(src).toContain("SemanticBadge");
    expect(src).toContain("mapGateStatusToBadgeTone");
    expect(src).not.toContain('variant: "default"');
  });
});
