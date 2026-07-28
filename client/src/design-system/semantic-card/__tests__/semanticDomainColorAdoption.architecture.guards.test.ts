/**
 * SEMANTIC-DOMAIN-COLOR-ADOPTION-1 — architecture guards.
 * REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1 — business cards use Reporting
 * full surfaces; soft accents remain deprecated helpers only.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  SEMANTIC_DOMAIN_ACCENT,
  SEMANTIC_DOMAIN_HEX,
  SEMANTIC_DOMAIN_SURFACE,
  semanticDomainAccentClass,
  semanticDomainReportingSurfaceClass,
  semanticDomainToTone,
} from "@/design-system/semantic-card";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("SEMANTIC-DOMAIN-COLOR-ADOPTION-1", () => {
  it("domain hex identities match Landing / program mapping", () => {
    expect(SEMANTIC_DOMAIN_HEX.qr).toBe("#fbbf24");
    expect(SEMANTIC_DOMAIN_HEX.orders).toBe("#38bdf8");
    expect(SEMANTIC_DOMAIN_HEX.kitchen).toBe("#a78bfa");
    expect(SEMANTIC_DOMAIN_HEX.payments).toBe("#34d399");
    expect(SEMANTIC_DOMAIN_HEX.revenue).toBe("#34d399");
    expect(SEMANTIC_DOMAIN_HEX.analytics).toBe("#22d3ee");
    expect(SEMANTIC_DOMAIN_HEX.growth).toBe("#2dd4bf");
    expect(SEMANTIC_DOMAIN_HEX.information).toBe("#38bdf8");
    expect(Object.keys(SEMANTIC_DOMAIN_ACCENT).length).toBe(11);
    expect(Object.keys(SEMANTIC_DOMAIN_SURFACE).length).toBe(11);
  });

  it("deprecated soft accent affects border/glow only (no bg-gradient flood helpers)", () => {
    const accent = semanticDomainAccentClass("kitchen");
    expect(accent).toContain("border-violet");
    expect(accent).toContain("hover:shadow-");
    expect(accent).not.toContain("bg-gradient");
    expect(semanticDomainToTone("orders")).toBe("info");
    expect(semanticDomainToTone("kitchen")).toBe("accent");
    expect(semanticDomainToTone("revenue")).toBe("success");
  });

  it("Reporting domain surfaces tint the full shell", () => {
    const surface = semanticDomainReportingSurfaceClass("kitchen");
    expect(surface).toContain("bg-gradient-to-b");
    expect(surface).toContain("from-violet-950");
    expect(surface).toContain("border-violet");
    expect(surface).toContain("hover:shadow-");
  });

  it("SemanticKpiCard accepts domain prop and uses Reporting surface", () => {
    const src = read(
      "client/src/design-system/semantic-card/components/SemanticKpiCard.tsx"
    );
    expect(src).toContain("domain?: SemanticDomain");
    expect(src).toContain("semanticDomainReportingSurfaceClass");
    expect(src).toContain("data-domain={domain}");
  });

  it("high-priority domains adopted on restaurant KPI surfaces", () => {
    expect(read("client/src/components/dashboard/OperationalSnapshotSection.tsx")).toContain(
      'domain="kitchen"'
    );
    expect(read("client/src/components/dashboard/SettlementOverviewSection.tsx")).toContain(
      'domain="revenue"'
    );
    expect(read("client/src/components/dashboard/OrdersDetailsSection.tsx")).toContain(
      'domain="orders"'
    );
    expect(read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx")).toContain(
      'domain="kitchen"'
    );
    expect(
      read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx")
    ).toContain('domain="analytics"');
  });

  it("ops tickets inherit Reporting domain surfaces", () => {
    expect(read("client/src/components/kitchen/KitchenExecutionCard.tsx")).toContain(
      'semanticDomainReportingSurfaceClass("kitchen")'
    );
    expect(read("client/src/components/operational-workspace/OperationalCard.tsx")).toContain(
      'semanticDomainReportingSurfaceClass("orders")'
    );
    expect(read("client/src/components/screen-management/FleetScreenCard.tsx")).toContain(
      'semanticDomainReportingSurfaceClass("analytics")'
    );
  });

  it("landing QR accent hex is amber SSOT", () => {
    const css = read("client/src/index.css");
    expect(css).toContain("--landing-accent-qr: #fbbf24");
    expect(css).toContain('.semantic-card[data-domain="kitchen"]');
    expect(
      existsSync(
        resolve(root, "client/src/design-system/semantic-card/tokens/domain.ts")
      )
    ).toBe(true);
  });
});
