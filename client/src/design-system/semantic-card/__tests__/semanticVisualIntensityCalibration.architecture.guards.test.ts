/**
 * SEMANTIC-VISUAL-INTENSITY-CALIBRATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SEMANTIC_DOMAIN_ACCENT,
  SEMANTIC_HOVER_PREMIUM,
  SEMANTIC_ICON_HOVER,
  SEMANTIC_PANEL_BASE,
} from "@/design-system/semantic-card";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("SEMANTIC-VISUAL-INTENSITY-CALIBRATION-1", () => {
  it("panel and hover intensity are calibrated upward (light alpha, not new hues)", () => {
    expect(SEMANTIC_PANEL_BASE).toContain("border-cyan-500/40");
    expect(SEMANTIC_HOVER_PREMIUM).toContain("brightness-[1.05]");
    expect(SEMANTIC_HOVER_PREMIUM).toContain("border-cyan-400/60");
    expect(SEMANTIC_ICON_HOVER).toContain("0.62");
    // Domain borders follow Reporting SSOT (/45) — REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1
    expect(SEMANTIC_DOMAIN_ACCENT.kitchen.border).toContain("/45");
    expect(SEMANTIC_DOMAIN_ACCENT.revenue.border).toContain("/45");
    expect(SEMANTIC_DOMAIN_ACCENT.kitchen.border).toContain("border-violet");
  });

  it("CSS ambient light alphas are calibrated (~0.16–0.20 range)", () => {
    const css = read("client/src/index.css");
    expect(css).toContain("SEMANTIC-VISUAL-INTENSITY-CALIBRATION-1");
    expect(css).toContain("rgb(34 211 238 / 0.16)");
    expect(css).toContain("rgb(34 211 238 / 0.20)");
    expect(css).toContain("opacity: 0.92");
  });

  it("remaining admin commercial / security / stats KPIs carry domain", () => {
    expect(
      read(
        "client/src/components/admin/commercial/CommercialOverviewSubscriptionHealth.tsx"
      )
    ).toContain("domain={domain}");
    expect(
      read(
        "client/src/components/admin/commercial/CommercialOverviewNeedsAttention.tsx"
      )
    ).toContain("domain={domain}");
    expect(
      read(
        "client/src/components/admin/domains/security/SecurityOverviewSection.tsx"
      )
    ).toContain('domain="analytics"');
    expect(read("client/src/pages/admin/StatisticsPanel.tsx")).toContain(
      'domain="growth"'
    );
  });

  it("motion still uses property allowlist (no transition-all in premium hover)", () => {
    expect(SEMANTIC_HOVER_PREMIUM).not.toContain("transition-all");
  });
});
