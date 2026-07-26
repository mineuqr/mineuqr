/**
 * REFUND-DOMAIN-IMPLEMENTATION-1 / ADR-ARCH-032 — architecture guards.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");
const domainDir = "shared/operational-session/check/refund";

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listTsFiles(dirRel: string): string[] {
  const abs = join(repoRoot, dirRel);
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const rel = `${dirRel}/${name}`.replace(/\\/g, "/");
    const full = join(repoRoot, rel);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__") continue;
      out.push(...listTsFiles(rel));
      continue;
    }
    if (name.endsWith(".ts")) out.push(rel);
  }
  return out;
}

describe("REFUND-DOMAIN-IMPLEMENTATION-1 architecture guards", () => {
  it("domain module exists under Check boundary", () => {
    const barrel = read(`${domainDir}/index.ts`);
    expect(barrel).toContain("REFUND-DOMAIN-IMPLEMENTATION-1");
    expect(barrel).toContain("ADR-ARCH-032");
    expect(barrel).toContain("executeRefundOnCheck");
    expect(barrel).toContain("calculateRefundBudget");
  });

  it("implements constitutional commands and events", () => {
    const cmds = read(`${domainDir}/refundCommands.ts`);
    for (const name of [
      "requestRefund",
      "validateRefund",
      "applyRefund",
      "publishCompensatingSettlementRecord",
      "completeRefund",
      "executeRefundOnCheck",
    ]) {
      expect(cmds).toContain(name);
    }
    const events = read(`${domainDir}/refundEvents.ts`);
    for (const name of [
      "RefundRequested",
      "RefundValidated",
      "RefundApplied",
      "RefundSettlementRecordPublished",
      "RefundCompleted",
    ]) {
      expect(events).toContain(name);
    }
  });

  it("commands return ADR-021-compatible outcomes", () => {
    const cmds = read(`${domainDir}/refundCommands.ts`);
    expect(cmds).toContain("already_applied");
    expect(cmds).toContain("applied");
    expect(cmds).toContain("ADR-021");
  });

  it("budget law and compensating SR rules are present", () => {
    const budget = read(`${domainDir}/refundBudget.ts`);
    expect(budget).toContain("RF-BUDGET");
    expect(budget).toContain("calculateRefundBudget");
    const cmds = read(`${domainDir}/refundCommands.ts`);
    expect(cmds).toContain('recordKind: "refund"');
    expect(cmds).toContain("priorSettlementRecordId");
    expect(cmds).toContain("createCompensatingSettlementRecord");
  });

  it("domain source has no infrastructure imports", () => {
    const importPatterns = [
      /from\s+["']drizzle/,
      /from\s+["']@trpc/,
      /from\s+["']express/,
      /from\s+["'][^"']*\/db["']/,
      /from\s+["'][^"']*_core/,
      /from\s+["']knex/,
      /from\s+["']typeorm/,
      /from\s+["']@prisma/,
      /Repository/,
    ];
    for (const file of listTsFiles(domainDir)) {
      const src = read(file);
      for (const pattern of importPatterns) {
        expect(src, `${file} must not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("Check Aggregate wires Refund under withCheckOwnedTransaction", () => {
    const service = read("server/operational-session/check/CheckService.ts");
    expect(service).toContain("applyRefundOnCheck");
    expect(service).toContain("REFUND-DOMAIN-IMPLEMENTATION-1");
    expect(service).toContain("withCheckOwnedTransaction");
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).toContain("executeRefundOnCheck");
    expect(integration).toContain("insertSettlementRecord");
  });

  it("forbids UI / Reporting / Register ownership in domain", () => {
    for (const file of listTsFiles(domainDir)) {
      const src = read(file);
      expect(src).not.toMatch(/from\s+["']react/);
      expect(src).not.toMatch(/reporting-platform/);
      expect(src).not.toMatch(/from\s+["'][^"']*crmp/);
    }
  });
});
