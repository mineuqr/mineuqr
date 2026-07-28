/**
 * SEMANTIC-CONFIRM-DIALOG-PLATFORM-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

const CONFIRM_MIGRATION_TARGETS = [
  "client/src/components/dashboard/DiningSessionActionBar.tsx",
  "client/src/components/dashboard/SessionRowQuickActions.tsx",
  "client/src/pages/Dashboard.tsx",
  "client/src/pages/Pricing.tsx",
  "client/src/components/admin/domains/customer-success/CustomerSuccessAccountsSection.tsx",
  "client/src/components/admin/domains/customer-success/CustomerSuccessTenantsSection.tsx",
  "client/src/components/admin/domains/security/SecurityAccountControlsSection.tsx",
  "client/src/components/multi-check-allocation/MultiCheckAllocationPanel.tsx",
  "client/src/components/settlement-record/SettlementSuccessDialog.tsx",
] as const;

describe("SEMANTIC-CONFIRM-DIALOG-PLATFORM-1", () => {
  it("exports SemanticConfirmDialog and kind/icon tokens", () => {
    const barrel = read("client/src/design-system/semantic-confirm-dialog/index.ts");
    expect(barrel).toContain("SemanticConfirmDialog");
    expect(barrel).toContain("SemanticConfirmKind");
    expect(barrel).toContain("SEMANTIC_CONFIRM_ICON");
    expect(
      existsSync(
        resolve(
          root,
          "client/src/design-system/semantic-confirm-dialog/components/SemanticConfirmDialog.tsx"
        )
      )
    ).toBe(true);
  });

  it("confirm chrome uses AlertDialog primitives and standardized icons", () => {
    const src = read(
      "client/src/design-system/semantic-confirm-dialog/components/SemanticConfirmDialog.tsx"
    );
    expect(src).toContain("AlertDialog");
    expect(src).toContain("AlertDialogTitle");
    expect(src).toContain("AlertDialogDescription");
    expect(src).toContain("Loader2");
    expect(src).toContain("data-slot=\"semantic-confirm-dialog\"");
    expect(src).not.toContain("trpc.");
    expect(src).not.toContain("mutate(");
  });

  it("migrated confirmation surfaces adopt SemanticConfirmDialog", () => {
    for (const rel of CONFIRM_MIGRATION_TARGETS) {
      const src = read(rel);
      expect(src).toContain("SemanticConfirmDialog");
      expect(src).not.toContain('from "@/components/ui/alert-dialog"');
    }
  });

  it("MarkPaidSettlementDialog remains workflow AlertDialog (not a simple confirm)", () => {
    const src = read("client/src/components/dashboard/MarkPaidSettlementDialog.tsx");
    expect(src).toContain('from "@/components/ui/alert-dialog"');
    expect(src).not.toContain("SemanticConfirmDialog");
  });

  it("program docs exist", () => {
    const base = "docs/engineering/programs/SEMANTIC-CONFIRM-DIALOG-PLATFORM-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
