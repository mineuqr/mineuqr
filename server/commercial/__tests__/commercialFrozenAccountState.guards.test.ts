/**
 * COMMERCIAL-FROZEN-ACCOUNT-STATE-1 — practical static architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

const PROGRAM = "docs/engineering/programs/COMMERCIAL-FROZEN-ACCOUNT-STATE-1";

const REQUIRED_DOCS = [
  "00-PROGRAM-PACKAGE.md",
  "ACCOUNT-STATE-ARCHITECTURE.md",
  "FROZEN-LIFECYCLE.md",
  "TRIAL-EXPIRY.md",
  "SUBSCRIPTION-EXPIRY.md",
  "LOGIN-REDIRECT.md",
  "COMMERCIAL-ROUTE-GUARD.md",
  "API-ENFORCEMENT.md",
  "PUBLIC-QR-FROZEN-BEHAVIOR.md",
  "DATA-PRESERVATION.md",
  "RENEWAL-RESTORATION.md",
  "OWNER-EXCEPTION.md",
  "MULTI-RESTAURANT-ANALYSIS.md",
  "TEST-PLAN.md",
  "REGRESSION-VALIDATION.md",
  "ARCHITECTURE-INVARIANTS.md",
  "FINAL-REPORT.md",
];

describe("COMMERCIAL-FROZEN-ACCOUNT-STATE-1 architecture guards", () => {
  it("registers the program documentation set", () => {
    for (const name of REQUIRED_DOCS) {
      expect(existsSync(resolve(root, PROGRAM, name))).toBe(true);
    }
  });

  it("derives Frozen from the existing entitlement hub", () => {
    const hub = read("server/subscription-runtime/subscriptionRuntimeService.ts");
    const derive = read("server/subscription-runtime/commercialAccountState.ts");
    const entitlements = read("src/lib/commercial/getCommercialEntitlements.ts");
    expect(hub).toContain("deriveCommercialAccountState");
    expect(hub).toContain("withAccountState");
    expect(derive).toContain('state: "FROZEN"');
    expect(entitlements).toContain("commercialAccountState");
    expect(hub).not.toMatch(/createFrozenAccountTable/);
  });

  it("enforces Frozen on verified commercial mutations", () => {
    const trpc = read("server/_core/trpc.ts");
    const guard = read("server/commercial/assertCommercialAccountActive.ts");
    expect(trpc).toContain("enforceFrozenCommercialMutations");
    expect(trpc).toContain("assertCommercialAccountActive");
    expect(guard).toContain("resolveOwnerEntitlements");
    expect(guard).not.toContain("if (isOwner)");
    expect(guard).not.toContain("localStorage");
  });

  it("does not invent a second trial duration", () => {
    const derive = read("server/subscription-runtime/commercialAccountState.ts");
    const trial = read("server/create-trial-subscription.ts");
    expect(derive).not.toMatch(/\b14\b/);
    expect(trial).toContain("resolveTrialDurationDays");
    expect(trial).toContain("TRIAL_DAYS");
  });
});
