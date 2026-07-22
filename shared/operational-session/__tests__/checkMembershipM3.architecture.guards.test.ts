/**
 * CHECK-GENERALIZATION-M3 / ADR-ARCH-020 — architecture guards for authoritative cutover.
 * COMPATIBILITY-CLEANUP-1 — rollback Session-scan / flags removed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-GENERALIZATION-M3 architecture guards", () => {
  it("CheckService money path uses membership discovery (authoritative)", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("listActiveOrderIdsForCheck");
    expect(svc).toContain("getOrdersByIds");
    expect(svc).toContain("syncSessionOrdersToCheck");
    expect(svc).not.toContain("checkMembershipAuthoritativeRead");
    expect(svc).not.toContain("loadOrdersSubtotalCompatibilitySessionScan");
  });

  it("membership compatibility env flags are removed", () => {
    const env = read("server/_core/env.ts");
    expect(env).not.toContain("CHECK_MEMBERSHIP_AUTHORITATIVE_READ");
    expect(env).not.toContain("checkMembershipAuthoritativeRead");
    expect(env).not.toContain("CHECK_MEMBERSHIP_DUAL_WRITE");
    expect(env).not.toContain("checkMembershipDualWrite");
  });

  it("does not introduce Order settle façade (M6)", () => {
    const routers = read("server/routers.ts");
    expect(routers).not.toMatch(/order\.settlePaid/);
  });
});
