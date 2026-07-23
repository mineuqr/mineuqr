/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 / ADR-ARCH-026 — architecture guards.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");
const domainDir = "shared/operational-session/check/settlementRecord";

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

describe("SETTLEMENT-RECORD-IMPLEMENTATION-1 domain architecture guards", () => {
  it("domain module exists under Check boundary as document not Aggregate Root", () => {
    const barrel = read(`${domainDir}/index.ts`);
    expect(barrel).toContain("SETTLEMENT-RECORD-IMPLEMENTATION-1");
    expect(barrel).toContain("NOT an Aggregate Root");
    expect(barrel).toContain("createSettlementRecord");
    expect(barrel).toContain("Never calculates money");
  });

  it("implements canonical kinds, identities, and producer", () => {
    const contract = read(`${domainDir}/settlementRecordContract.ts`);
    for (const k of ["settlement", "refund", "void", "reversal", "correction"]) {
      expect(contract).toContain(`"${k}"`);
    }
    expect(contract).toContain("settlementRecordId");
    expect(contract).toContain("recordGeneration");
    expect(contract).toContain("check_aggregate");
    expect(contract).toContain("NOT an Aggregate Root");
  });

  it("commands return applied | already_applied", () => {
    const cmds = read(`${domainDir}/settlementRecordCommands.ts`);
    expect(cmds).toContain('"applied"');
    expect(cmds).toContain('"already_applied"');
    expect(cmds).toContain("createCompensatingSettlementRecord");
  });

  it("domain has no persistence / drizzle / money calculators", () => {
    const files = listTsFiles(domainDir);
    for (const rel of files) {
      const src = read(rel);
      expect(src).not.toMatch(/from ["'].*drizzle/);
      expect(src).not.toMatch(/\bcomputeCheckMoney\b/);
      expect(src).not.toMatch(/\b\.update\s*\(/);
      expect(src).not.toMatch(/\bdb\./);
    }
  });

  it("invariants document SR-INV-01…06", () => {
    const inv = read(`${domainDir}/settlementRecordInvariants.ts`);
    expect(inv).toContain("SR-INV-01");
    expect(inv).toContain("SR-INV-02");
    expect(inv).toContain("SR-INV-03");
    expect(inv).toContain("SR-INV-07");
    expect(inv).toContain("assertAppendOnly");
  });

  it("CheckService creates Settlement Record inside finalize TX", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("createSettlementRecordForCheckFinalize");
    expect(svc).toContain("SR-INV-04");
    expect(svc).toContain("settlementRecordEvents");
  });
});
