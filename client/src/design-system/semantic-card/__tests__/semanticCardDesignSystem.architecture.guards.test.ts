/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1 — architecture guards.
 * Presentation SSOT: category hex + surface must stay unified; no duplicate hex maps.
 */
import { describe, expect, it } from "vitest";
import {
  SEMANTIC_CATEGORY_HEX,
  SEMANTIC_CATEGORY_SURFACE,
  SEMANTIC_PANEL_BASE,
  SEMANTIC_TONE,
} from "@/design-system/semantic-card";
import { REPORTING_CATEGORY_HEX } from "@/lib/reporting-exports/reportingExecutiveColors";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("SEMANTIC-CARD-DESIGN-SYSTEM-1", () => {
  it("REPORTING_CATEGORY_HEX is a facade of SEMANTIC_CATEGORY_HEX", () => {
    expect(REPORTING_CATEGORY_HEX).toEqual(SEMANTIC_CATEGORY_HEX);
    expect(REPORTING_CATEGORY_HEX.refund).toBe("#fb7185");
    expect(REPORTING_CATEGORY_HEX.net).toBe("#2dd4bf");
  });

  it("every executive category has both hex and surface tokens", () => {
    for (const key of Object.keys(SEMANTIC_CATEGORY_HEX) as Array<
      keyof typeof SEMANTIC_CATEGORY_HEX
    >) {
      expect(SEMANTIC_CATEGORY_HEX[key]).toMatch(/^#/);
      expect(SEMANTIC_CATEGORY_SURFACE[key].shell).toBeTruthy();
      expect(SEMANTIC_CATEGORY_SURFACE[key].icon).toBeTruthy();
      expect(SEMANTIC_CATEGORY_SURFACE[key].value).toBeTruthy();
    }
  });

  it("semantic tone owns success/warning/danger/info/neutral/accent", () => {
    for (const tone of [
      "neutral",
      "info",
      "success",
      "warning",
      "danger",
      "accent",
    ] as const) {
      expect(SEMANTIC_TONE.icon[tone]).toBeTruthy();
      expect(SEMANTIC_TONE.badge[tone]).toBeTruthy();
      expect(SEMANTIC_TONE.row[tone]).toBeTruthy();
    }
  });

  it("panel base is the single cyan panel string", () => {
    expect(SEMANTIC_PANEL_BASE).toContain("border-cyan-500/40");
    expect(SEMANTIC_PANEL_BASE).toContain("from-slate-800/55");
  });

  it("ExecutivePeriodDashboard does not redefine CATEGORY_STYLE", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "client/src/components/dashboard/ExecutivePeriodDashboard.tsx"
      ),
      "utf8"
    );
    expect(src).not.toContain("const CATEGORY_STYLE");
    expect(src).toContain("SemanticExecutive");
  });

  it("reportingExecutiveColors does not hardcode hex values", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "client/src/lib/reporting-exports/reportingExecutiveColors.ts"
      ),
      "utf8"
    );
    expect(src).not.toContain("#34d399");
    expect(src).toContain("SEMANTIC_CATEGORY_HEX");
  });
});
