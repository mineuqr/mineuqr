/**
 * FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1 — print root / CSS isolation guards.
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SHIFT_CLOSING_PRINT_BODY_CLASS,
  SHIFT_CLOSING_PRINT_ROOT_ID,
} from "../shiftClosingPresentation";

const root = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Shift closing print isolation", () => {
  it("scopes print CSS to body class and single root id", () => {
    const css = read("src/index.css");
    expect(css).toContain("FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1");
    expect(css).toContain(`body.${SHIFT_CLOSING_PRINT_BODY_CLASS}`);
    expect(css).toContain(`#${SHIFT_CLOSING_PRINT_ROOT_ID}`);
    expect(css).toContain("visibility: hidden !important");
    expect(css).toContain("visibility: visible !important");
    expect(css).toContain("break-inside: avoid");
    expect(css).toContain("page-break-inside: avoid");
  });

  it("printShiftClosingReport toggles isolation body class", () => {
    const src = read(
      "src/lib/register-operations-presentation/shiftClosingPresentation.ts"
    );
    expect(src).toContain("FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1");
    expect(src).toContain("SHIFT_CLOSING_PRINT_BODY_CLASS");
    expect(src).toContain("afterprint");
    expect(src).toContain("classList.add");
    expect(src).toContain("classList.remove");
    expect(src).toContain("window.print()");
  });

  it("panel mounts exactly one print host and dialog does not mount report", () => {
    const panel = read(
      "src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    const dialog = read(
      "src/components/register-operations/ShiftClosingSummaryDialog.tsx"
    );
    const host = read(
      "src/components/register-operations/ShiftClosingPrintHost.tsx"
    );

    expect(panel).toContain("FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1");
    expect(panel.match(/<ShiftClosingPrintHost\b/g)?.length).toBe(1);
    expect(panel).not.toContain("ShiftClosingPrintReport");
    expect(panel).not.toContain("hidden print:block");

    expect(dialog).not.toContain("ShiftClosingPrintReport");
    expect(dialog).not.toContain("hidden print:block");
    expect(dialog).toContain("onPrint");

    expect(host).toContain("createPortal");
    expect(host).toContain("SHIFT_CLOSING_PRINT_ROOT_ID");
    expect(host).toContain("ShiftClosingPrintReport");
  });

  it("print report marks page-break blocks", () => {
    const report = read(
      "src/components/register-operations/ShiftClosingPrintReport.tsx"
    );
    expect(report).toContain("shift-closing-print-block");
    expect(report).toContain("tenderSummarySection");
    expect(report).toContain("cashDrawerSection");
    expect(report).not.toContain('id="shift-closing-report-print"');
  });
});
