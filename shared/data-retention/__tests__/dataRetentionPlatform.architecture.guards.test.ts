/**
 * DATA-RETENTION-PLATFORM-1 / ADR-ARCH-031 — architecture guards.
 * @vitest-environment node
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "__tests__") continue;
      out.push(...walk(p));
    } else if (p.endsWith(".ts")) {
      out.push(p);
    }
  }
  return out;
}

describe("DRAP architecture guards", () => {
  it("platform sources stay domain-free", () => {
    const files = walk(root);
    expect(files.length).toBeGreaterThan(5);
    const blob = files.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(blob).toContain("ADR-ARCH-031");
    expect(blob).toContain("DATA-RETENTION-PLATFORM-1");
    expect(blob).not.toMatch(/from ["']@shared\/crmp/);
    expect(blob).not.toMatch(/from ["']@shared\/operational-session/);
    expect(blob).not.toMatch(/from ["']@shared\/reporting-platform/);
    expect(blob).not.toContain("computeExpectedCash");
    expect(blob).not.toContain("settleCheck");
    expect(blob).not.toContain("drizzle");
    expect(blob).not.toContain("trpc.");
  });

  it("exposes required modules from barrel", () => {
    const index = readFileSync(join(root, "index.ts"), "utf8");
    for (const token of [
      "createRetentionPolicyRegistry",
      "createDataRetentionPlatform",
      "createRetentionScheduler",
      "createRetentionHoldRegistry",
      "RetentionAdapter",
      "evaluateRetentionEligibility",
      "validateRetentionPolicy",
      "DEFAULT_RETENTION_FEATURE_FLAGS",
    ]) {
      expect(index).toContain(token);
    }
  });
});
