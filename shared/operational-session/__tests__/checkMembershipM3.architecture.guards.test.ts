/**
 * CHECK-GENERALIZATION-M3 / ADR-ARCH-020 — architecture guards for authoritative cutover.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-GENERALIZATION-M3 architecture guards", () => {
  it("CheckService money path uses membership discovery (authoritative cutover)", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("listActiveOrderIdsForCheck");
    expect(svc).toContain("getOrdersByIds");
    expect(svc).toContain("checkMembershipAuthoritativeRead");
    expect(svc).toContain("dualWriteSyncSessionOrdersToCheck");
    // Session scan may remain as bootstrap/rollback only — not sole authority.
    expect(svc).toContain("loadOrdersSubtotalFromSession");
  });

  it("authoritative-read env flag exists and defaults ON", () => {
    const env = read("server/_core/env.ts");
    expect(env).toContain("CHECK_MEMBERSHIP_AUTHORITATIVE_READ");
    expect(env).toContain("checkMembershipAuthoritativeRead");
    expect(env).toContain('CHECK_MEMBERSHIP_AUTHORITATIVE_READ !== "false"');
    expect(env).toContain("CHECK_MEMBERSHIP_DUAL_WRITE");
  });

  it("does not introduce sessionless EnsureCheckForOrder (M4) or Order settle façade", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).not.toContain("EnsureCheckForOrder");
    expect(svc).not.toContain("ensureCheckForOrder");
    expect(svc).not.toContain("settleCheckPaidById");
  });
});
