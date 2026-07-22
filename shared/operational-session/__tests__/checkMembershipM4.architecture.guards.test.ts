/**
 * CHECK-GENERALIZATION-M4 / ADR-ARCH-020 — Session optionality architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-GENERALIZATION-M4 architecture guards", () => {
  it("schema allows nullable Check and Settlement sessionId", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('mysqlTable("operational_checks"');
    expect(schema).toContain('mysqlTable(\n\t"check_settlement_transactions"');
    const sql = read("drizzle/0072_check_session_optionality.sql");
    expect(sql).toContain("MODIFY COLUMN `sessionId` INT NULL");
    expect(sql).toContain("operational_checks");
    expect(sql).toContain("check_settlement_transactions");
  });

  it("CheckService exposes Check-centric financial APIs", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("export async function ensureCheckForOrder");
    expect(svc).toContain("export async function settleCheckPaidById");
    expect(svc).toContain("export async function settleCheckComplimentaryById");
    expect(svc).toContain("export async function voidCheckById");
    expect(svc).toContain("export async function createOpenCheck");
    expect(svc).toContain("export async function recalculateOpenCheck");
    // Session façades remain
    expect(svc).toContain("export async function settleCheckPaid");
    expect(svc).toContain("export async function createOpenCheckForSession");
    const barrel = read("server/operational-session/index.ts");
    expect(barrel).toContain("settleCheckPaidById");
    expect(barrel).toContain("ensureCheckForOrder");
  });

  it("enrollOrderInCheck is not gated by dual-write", () => {
    const membership = read(
      "server/operational-session/check/checkMembershipService.ts"
    );
    const enrollBlock = membership.slice(
      membership.indexOf("export async function enrollOrderInCheck"),
      membership.indexOf("export async function dualWriteEnrollOrderForSession")
    );
    expect(enrollBlock).not.toContain("dualWriteEnabled()");
    expect(membership).toContain("if (!dualWriteEnabled()) return");
  });

  it("does not ship Order settle façade (M6)", () => {
    const routers = read("server/routers.ts");
    expect(routers).not.toMatch(/order\.settlePaid/);
  });
});
