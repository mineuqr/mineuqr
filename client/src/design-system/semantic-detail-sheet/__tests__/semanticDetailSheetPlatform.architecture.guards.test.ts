/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

const DETAIL_SHEET_MIGRATION_TARGETS = [
  "client/src/components/settlement-record/SettlementDetailSheet.tsx",
  "client/src/components/admin/domains/security/AuditEventDetailDrawer.tsx",
  "client/src/components/operational-workspace/OperationalDetailsDrawer.tsx",
  "client/src/components/screen-management/ScreenDetailsSheet.tsx",
  "client/src/components/screen-management/ScreenCredentialLifecycleSheet.tsx",
  "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx",
  "client/src/components/dashboard/OperationalActivityFeedSection.tsx",
] as const;

const PLATFORM_PRIMITIVES = [
  "SemanticDetailSheet",
  "SemanticDetailHeader",
  "SemanticDetailSection",
  "SemanticDetailFact",
  "SemanticDetailGroup",
  "SemanticDetailFooter",
  "SemanticDetailLoading",
  "SemanticDetailEmpty",
  "SemanticDetailError",
  "SemanticDetailDivider",
] as const;

describe("SEMANTIC-DETAIL-SHEET-PLATFORM-1", () => {
  it("exports Semantic Detail Sheet platform primitives and size tokens", () => {
    const barrel = read("client/src/design-system/semantic-detail-sheet/index.ts");
    for (const name of PLATFORM_PRIMITIVES) {
      expect(barrel).toContain(name);
    }
    expect(barrel).toContain("SemanticDetailSheetSize");
    expect(barrel).toContain("SEMANTIC_DETAIL_SHEET_SIZE_CLASS");
    expect(
      existsSync(
        resolve(
          root,
          "client/src/design-system/semantic-detail-sheet/components/SemanticDetailSheet.tsx"
        )
      )
    ).toBe(true);
    expect(read("client/src/design-system/index.ts")).toContain(
      "semantic-detail-sheet"
    );
  });

  it("detail chrome is presentation-only (no domain/API ownership)", () => {
    const files = [
      "client/src/design-system/semantic-detail-sheet/components/SemanticDetailSheet.tsx",
      "client/src/design-system/semantic-detail-sheet/components/SemanticDetailChrome.tsx",
      "client/src/design-system/semantic-detail-sheet/components/SemanticDetailFact.tsx",
      "client/src/design-system/semantic-detail-sheet/components/SemanticDetailSection.tsx",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toContain("trpc.");
      expect(src).not.toContain("mutate(");
      expect(src).not.toContain("useQuery");
      expect(src).not.toContain("useMutation");
    }
    const shell = read(
      "client/src/design-system/semantic-detail-sheet/components/SemanticDetailSheet.tsx"
    );
    expect(shell).toContain("data-slot=\"semantic-detail-sheet\"");
    expect(shell).toContain("SheetContent");
    expect(shell).toContain("SEMANTIC_DETAIL_SHEET_SIZE_CLASS");
  });

  it("eligible read-oriented Sheets adopt SemanticDetailSheet", () => {
    for (const rel of DETAIL_SHEET_MIGRATION_TARGETS) {
      const src = read(rel);
      expect(src).toContain("SemanticDetailSheet");
      expect(src).not.toContain('from "@/components/ui/sheet"');
    }
  });

  it("removes local Field / DetailFact presentation duplicates on migrated sheets", () => {
    const settlement = read(
      "client/src/components/settlement-record/SettlementDetailSheet.tsx"
    );
    expect(settlement).toContain("SemanticDetailFact");
    expect(settlement).not.toMatch(/function Field\s*\(/);

    const audit = read(
      "client/src/components/admin/domains/security/AuditEventDetailDrawer.tsx"
    );
    expect(audit).toContain("SemanticDetailFact");
    expect(audit).not.toMatch(/function DetailFact\s*\(/);
    expect(audit).toContain("AuditEventDetailSheet");
  });

  it("legacy Drawer names remain as aliases; Sheet names preferred", () => {
    const ops = read(
      "client/src/components/operational-workspace/OperationalDetailsDrawer.tsx"
    );
    expect(ops).toContain("export function OperationalDetailsSheet");
    expect(ops).toContain(
      "export const OperationalDetailsDrawer = OperationalDetailsSheet"
    );

    const audit = read(
      "client/src/components/admin/domains/security/AuditEventDetailDrawer.tsx"
    );
    expect(audit).toContain("export function AuditEventDetailSheet");
    expect(audit).toContain(
      "export const AuditEventDetailDrawer = AuditEventDetailSheet"
    );
  });

  it("feature-owned editor Sheets remain outside the platform", () => {
    const settings = read(
      "client/src/components/screen-management/ScreenSettingsSheet.tsx"
    );
    expect(settings).toContain('from "@/components/ui/sheet"');
    expect(settings).not.toContain("SemanticDetailSheet");

    const sidebar = read("client/src/components/ui/sidebar.tsx");
    expect(sidebar).toContain('from "@/components/ui/sheet"');
    expect(sidebar).not.toContain("SemanticDetailSheet");
  });

  it("program docs exist", () => {
    const base = "docs/engineering/programs/SEMANTIC-DETAIL-SHEET-PLATFORM-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
