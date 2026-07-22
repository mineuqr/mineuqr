/**
 * ORDER-SETTLEMENT-DOMAIN-1 / ADR-ARCH-022 — architecture guards.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");
const domainDir = "shared/operational-session/check/orderSettlement";

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

describe("ORDER-SETTLEMENT-DOMAIN-1 architecture guards", () => {
  it("domain module exists under Check boundary", () => {
    const barrel = read(`${domainDir}/index.ts`);
    expect(barrel).toContain("ORDER-SETTLEMENT-DOMAIN-1");
    expect(barrel).toContain("createOrderSettlement");
    expect(barrel).toContain("IllegalTerminalTransitionError");
  });

  it("implements canonical statuses and I-OS-14", () => {
    const contract = read(`${domainDir}/orderSettlementContract.ts`);
    for (const s of [
      "pending",
      "partially_settled",
      "settled",
      "complimentary",
      "cancelled",
      "voided",
      "refunded",
    ]) {
      expect(contract).toContain(`"${s}"`);
    }
    const lifecycle = read(`${domainDir}/orderSettlementLifecycle.ts`);
    expect(lifecycle).toContain("I-OS-14");
    expect(lifecycle).toContain("IllegalTerminalTransitionError");
  });

  it("commands return explicit ADR-021-compatible outcomes", () => {
    const cmds = read(`${domainDir}/orderSettlementCommands.ts`);
    expect(cmds).toContain('OrderSettlementCommandOutcome');
    expect(cmds).toContain('"applied"');
    expect(cmds).toContain('"already_in_state"');
    expect(cmds).toContain("ADR-021");
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

  it("is exported from Check and operational-session barrels", () => {
    const check = read("shared/operational-session/check/index.ts");
    const root = read("shared/operational-session/index.ts");
    expect(check).toContain("createOrderSettlement");
    expect(check).toContain('from "./orderSettlement"');
    expect(root).toContain("createOrderSettlement");
    expect(root).toContain("OrderSettlement");
  });

  it("does not claim Aggregate Root or Revenue ownership", () => {
    const contract = read(`${domainDir}/orderSettlementContract.ts`);
    expect(contract).toContain("Not an Aggregate Root");
    const invariants = read(`${domainDir}/orderSettlementInvariants.ts`);
    expect(invariants).toContain("I-OS-10");
    expect(invariants).toContain("must not be treated as Check Revenue");
  });
});
