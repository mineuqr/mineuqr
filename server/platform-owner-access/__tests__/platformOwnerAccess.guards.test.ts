/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 guards", () => {
  it("identifies the owner via ENV.ownerOpenId, never userId === 1", () => {
    const identity = read("server/platform-owner-access/identity.ts");
    expect(identity).toContain("isPlatformAccountUser");
    expect(identity).toContain("isOwnerOpenIdConfigured");
    expect(identity).not.toMatch(/user\.id\s*===\s*1/);
    expect(identity).not.toMatch(/role\s*===\s*["']admin["']/);
  });

  it("centralizes owner entitlements in the hub", () => {
    const hub = read("server/commercial/getCommercialEntitlements.ts");
    expect(hub).toContain("resolveOwnerEntitlements");
    expect(hub).toContain("Platform Owner");
    expect(hub).toContain("Legacy Bridge ONLY");

    const runtime = read("server/subscription-runtime/subscriptionRuntimeService.ts");
    expect(runtime).toContain("isPlatformOwner");
    expect(runtime).toContain("resolvePlatformOwnerEntitlements");
    expect(runtime).toContain("loadOwnerAccessMode");
  });

  it("does not mutate subscriptions, bindings, checkout, or catalog editor", () => {
    const store = read("server/platform-owner-access/store.ts");
    const service = read("server/platform-owner-access/service.ts");
    const entitlements = read("server/platform-owner-access/entitlements.ts");
    const combined = `${store}\n${service}\n${entitlements}`;
    expect(combined).not.toMatch(/user_subscriptions|createUserSubscription|600001/);
    expect(combined).not.toMatch(/commercial_subscription_bindings|ensureLivePlanBound/);
    expect(combined).not.toMatch(/createInvoice|createTapCheckout|createCheckoutSession/);
    expect(combined).not.toMatch(/saveLivePlan|planService\.saveLive/);
  });

  it("uses dedicated owner-access table only", () => {
    const sql = read("drizzle/0087_platform_owner_access_mode.sql");
    const create = sql.slice(sql.indexOf("CREATE TABLE"));
    expect(create).toContain("platform_owner_access_mode");
    expect(create).not.toMatch(/user_subscriptions|subscription_plans|invoices|payments/);
    expect(create).not.toMatch(/commercial_plans|`users`|`restaurants`/);
    expect(sql).toContain("FULL_PLATFORM");
    expect(sql).toContain("SIMULATED_PLAN");
  });

  it("isolates cache identity by owner mode", () => {
    const cache = read("server/subscription-runtime/cache.ts");
    expect(cache).toContain("platform_owner");
    expect(cache).toContain("simulatedPlanCode");
    expect(cache).toContain("customer:");
  });
});
