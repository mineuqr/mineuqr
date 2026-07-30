/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 guards", () => {
  it("provides subscription-runtime package surface", () => {
    expect(
      existsSync(resolve(root, "server/subscription-runtime/index.ts"))
    ).toBe(true);
    expect(
      existsSync(
        resolve(root, "server/subscription-runtime/subscriptionRuntimeService.ts")
      )
    ).toBe(true);
    expect(
      existsSync(resolve(root, "server/subscription-runtime/snapshotLoader.ts"))
    ).toBe(true);
    expect(
      existsSync(resolve(root, "server/subscription-runtime/entitlementResolver.ts"))
    ).toBe(true);
    expect(
      existsSync(resolve(root, "server/subscription-runtime/enforcement.ts"))
    ).toBe(true);
    expect(
      existsSync(resolve(root, "server/subscription-runtime/capabilityMatrix.ts"))
    ).toBe(true);
  });

  it("hub delegates to Subscription Runtime (Snapshot ONLY / Legacy Bridge ONLY)", () => {
    const hub = read("server/commercial/getCommercialEntitlements.ts");
    expect(hub).toContain("resolveOwnerEntitlements");
    expect(hub).toContain("Snapshot ONLY");
    expect(hub).toContain("Legacy Bridge ONLY");
    expect(hub).not.toMatch(/planFeatureMatrix/);
    expect(hub).not.toMatch(/buildCommercialContextFromDb/);
  });

  it("resolver must not import live Catalog or planFeatureMatrix", () => {
    const resolver = read(
      "server/subscription-runtime/entitlementResolver.ts"
    );
    expect(resolver).not.toMatch(/from ["']@commercial\/planFeatureMatrix["']/);
    expect(resolver).not.toMatch(/commercialCatalog\.(get|list)/);
    expect(resolver).toContain("MUST NOT import live Catalog feature matrix");
  });

  it("snapshot loader uses binding hydrate only", () => {
    const loader = read("server/subscription-runtime/snapshotLoader.ts");
    expect(loader).toContain("resolveCommercialFactsFromSnapshot");
    expect(loader).toContain("getSubscriptionCommercialBinding");
    expect(loader).toContain("NEVER reads mutable Catalog");
  });

  it("guest ordering uses canonical hasFeature enforcement", () => {
    const guest = read("server/commercial/guestOrderingAuthority.ts");
    expect(guest).toContain('hasFeature');
    expect(guest).toContain('"ordering"');
  });
});
