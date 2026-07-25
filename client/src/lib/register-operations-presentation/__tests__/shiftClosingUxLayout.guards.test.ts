/**
 * FINANCIAL-SHIFT-CLOSING-UX-REFINEMENT-1 — layout / scroll governance guards.
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

  it("uses a wide dialog container and overrides default max-w-lg", () => {
    expect(dialog).toContain("FINANCIAL-SHIFT-CLOSING-UX-REFINEMENT-1");
    expect(dialog).toContain("max-w-4xl");
    expect(dialog).toContain("sm:max-w-4xl");
    expect(dialog).toContain("w-[min(100vw-1rem,56rem)]");
    expect(dialog).not.toMatch(/["'`][^"'`]*max-w-lg/);
  });

  it("keeps a single body scroll container and sticky footer", () => {
    expect(dialog).toContain('data-closing-scroll="body"');
    expect(dialog).toContain('data-closing-footer="actions"');
    expect(dialog).toContain("overflow-x-hidden");
    expect(dialog).toContain("overflow-y-auto");
    expect(dialog).toContain("shrink-0 border-t");
    // Entire DialogContent must not be the only scroll (footer clipped).
    expect(dialog).toMatch(/flex-col[\s\S]*overflow-hidden/);
  });

  it("places tender and drawer side-by-side on large screens", () => {
    expect(dialog).toContain("lg:grid-cols-2");
    expect(dialog).toContain("min-w-0");
    expect(dialog).toContain("break-words");
  });

  it("keeps touch-friendly footer actions", () => {
    expect(dialog).toContain("min-h-11");
    expect(dialog).toContain("touch-manipulation");
    expect(dialog).toContain("printClosingReport");
    expect(dialog).toContain("cashCountConfirm");
  });
});
