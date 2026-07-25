/**
 * FINANCIAL-SHIFT-CLOSING-UX-REFINEMENT-1 /
 * FINANCIAL-SHIFT-CLOSING-DIALOG-DIMENSIONS-1 — layout / dimension guards.
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Shift closing UX layout guards", () => {
  const dialog = read(
    "src/components/register-operations/ShiftClosingSummaryDialog.tsx"
  );

  it("uses a wide content-height dialog (not oversized tall)", () => {
    expect(dialog).toContain("FINANCIAL-SHIFT-CLOSING-UX-REFINEMENT-1");
    expect(dialog).toContain("FINANCIAL-SHIFT-CLOSING-DIALOG-DIMENSIONS-1");
    expect(dialog).toContain("max-w-6xl");
    expect(dialog).toContain("sm:max-w-6xl");
    expect(dialog).toContain("w-[min(100vw-1.5rem,72rem)]");
    expect(dialog).toContain("h-auto");
    expect(dialog).toContain("max-h-[min(88dvh,40rem)]");
    expect(dialog).not.toMatch(/["'`][^"'`]*max-w-lg/);
    expect(dialog).not.toContain("max-w-4xl");
    expect(dialog).not.toContain("52rem");
  });

  it("keeps a single body scroll container and sticky footer", () => {
    expect(dialog).toContain('data-closing-scroll="body"');
    expect(dialog).toContain('data-closing-footer="actions"');
    expect(dialog).toContain("overflow-x-hidden");
    expect(dialog).toContain("overflow-y-auto");
    expect(dialog).toContain("shrink-0 border-t");
    expect(dialog).toMatch(/flex-col[\s\S]*overflow-hidden/);
  });

  it("places equal-weight tender and drawer cards side-by-side", () => {
    expect(dialog).toContain('data-closing-cards="equal"');
    expect(dialog).toContain("md:grid-cols-2");
    expect(dialog).toContain("items-stretch");
    expect(dialog).toContain("min-w-0");
    expect(dialog).toContain("break-words");
  });

  it("keeps a compact footer with touch-friendly actions", () => {
    expect(dialog).toContain("min-h-11");
    expect(dialog).toContain("sm:min-h-10");
    expect(dialog).toContain("touch-manipulation");
    expect(dialog).toContain("sm:flex-row");
    expect(dialog).toContain("printClosingReport");
    expect(dialog).toContain("cashCountConfirm");
    expect(dialog).toContain("py-2.5");
  });
});
