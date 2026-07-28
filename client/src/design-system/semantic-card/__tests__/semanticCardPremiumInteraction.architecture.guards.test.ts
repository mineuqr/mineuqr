/**
 * SEMANTIC-CARD-PREMIUM-INTERACTION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  SEMANTIC_HOVER_GLOW,
  SEMANTIC_HOVER_PREMIUM,
  SEMANTIC_INTERACTION,
  SEMANTIC_MOTION,
  SEMANTIC_MOTION_PREMIUM,
  SEMANTIC_PANEL_BASE,
  SEMANTIC_SURFACE_PREMIUM,
} from "@/design-system/semantic-card";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("SEMANTIC-CARD-PREMIUM-INTERACTION-1", () => {
  it("exports premium interaction tokens and aliases hover/motion", () => {
    expect(
      existsSync(
        resolve(
          root,
          "client/src/design-system/semantic-card/tokens/interaction.ts"
        )
      )
    ).toBe(true);
    expect(SEMANTIC_SURFACE_PREMIUM).toBe("semantic-card");
    expect(SEMANTIC_PANEL_BASE).toContain("semantic-card");
    expect(SEMANTIC_PANEL_BASE).toContain("border-cyan-500/40");
    expect(SEMANTIC_HOVER_GLOW).toBe(SEMANTIC_HOVER_PREMIUM);
    expect(SEMANTIC_MOTION).toBe(SEMANTIC_MOTION_PREMIUM);
    expect(SEMANTIC_INTERACTION.hover).toContain("translate-y");
    expect(SEMANTIC_MOTION_PREMIUM).toContain("motion-safe:");
  });

  it("premium CSS lighting system exists with reduced-motion support", () => {
    const css = read("client/src/index.css");
    expect(css).toContain(".semantic-card");
    expect(css).toContain(".semantic-card::before");
    expect(css).toContain(".semantic-card-kpi-primary");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toMatch(/\.semantic-card[\s\S]*transform:\s*none/);
  });

  it("SemanticKpiCard uses icon/value hover micro-interactions", () => {
    const src = read(
      "client/src/design-system/semantic-card/components/SemanticKpiCard.tsx"
    );
    expect(src).toContain("SEMANTIC_ICON_HOVER");
    expect(src).toContain("SEMANTIC_VALUE_HOVER");
    expect(src).toContain('data-slot="semantic-kpi-card"');
  });

  it("SemanticExecutiveCard uses premium executive hover + surface lighting", () => {
    const src = read(
      "client/src/design-system/semantic-card/components/SemanticExecutiveCard.tsx"
    );
    expect(src).toContain("SEMANTIC_EXECUTIVE_HOVER");
    expect(src).toContain("SEMANTIC_SURFACE_PREMIUM");
    expect(src).toContain("SEMANTIC_ICON_HOVER");
    expect(src).not.toContain("hover:scale-[1.02]");
  });

  it("motion uses property allowlist not transition-all", () => {
    expect(SEMANTIC_MOTION_PREMIUM).not.toContain("transition-all");
    expect(SEMANTIC_MOTION_PREMIUM).toContain("transform");
    expect(SEMANTIC_MOTION_PREMIUM).toContain("opacity");
  });
});
