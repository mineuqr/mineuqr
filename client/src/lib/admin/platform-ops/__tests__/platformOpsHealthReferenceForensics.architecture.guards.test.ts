/**
 * PLATFORM-OPS-HEALTH-REFERENCE-FORENSICS-1 — missing symbol guard.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { normalizePlatformOpsHealth } from "@/design-system/platform-ops-ui";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("PLATFORM-OPS-HEALTH-REFERENCE-FORENSICS-1", () => {
  it("normalizePlatformOpsHealth remains defined and exported", () => {
    expect(typeof normalizePlatformOpsHealth).toBe("function");
    expect(normalizePlatformOpsHealth("unavailable")).toBe("unavailable");
    const barrel = read("client/src/design-system/platform-ops-ui/index.ts");
    expect(barrel).toContain("normalizePlatformOpsHealth");
    const status = read("client/src/design-system/platform-ops-ui/status.ts");
    expect(status).toContain("export function normalizePlatformOpsHealth");
  });

  it("Realtime composition imports normalizePlatformOpsHealth when used", () => {
    const src = read(
      "client/src/components/admin/platform-ops/PlatformOpsRealtimeComposition.tsx"
    );
    expect(src).toContain("normalizePlatformOpsHealth");
    expect(src).toMatch(
      /import\s*\{[\s\S]*normalizePlatformOpsHealth[\s\S]*\}\s*from\s*["']@\/design-system\/platform-ops-ui["']/
    );
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/PLATFORM-OPS-HEALTH-REFERENCE-FORENSICS-1";
    expect(existsSync(resolve(root, `${base}/FINAL-REPORT.md`))).toBe(true);
  });
});
