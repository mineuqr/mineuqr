/**
 * MULTI-CHECK-ALLOCATION-DOMAIN-1 / ADR-ARCH-025 — architecture guards.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");
const domainDir = "shared/operational-session/check/multiCheckAllocation";

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

describe("MULTI-CHECK-ALLOCATION-DOMAIN-1 architecture guards", () => {
  it("domain module exists under Check boundary", () => {
    const barrel = read(`${domainDir}/index.ts`);
    expect(barrel).toContain("MULTI-CHECK-ALLOCATION-DOMAIN-1");
    expect(barrel).toContain("createMultiCheckAllocation");
    expect(barrel).toContain("IllegalTerminalTransitionError");
    expect(barrel).toContain("NOT an Aggregate Root");
  });

  it("implements canonical statuses, identities, and terminal protection", () => {
    const contract = read(`${domainDir}/multiCheckAllocationContract.ts`);
    for (const s of [
      "pending",
      "reserved",
      "applied",
      "adjusted",
      "reversed",
      "completed",
      "cancelled",
    ]) {
      expect(contract).toContain(`"${s}"`);
    }
    for (const id of [
      "AllocationId",
      "AllocationReference",
      "FinancialReference",
      "SourcePaymentId",
      "SourceCheckId",
      "TargetCheckId",
      "AllocationSequence",
      "AllocationPortionId",
      "AllocationAdjustmentId",
      "AllocationReversalId",
    ]) {
      expect(contract).toContain(id);
    }
    expect(contract).toContain("NOT an Aggregate Root");
    expect(contract).toContain("impliesCheckSettlement");
    expect(contract).toContain("impliesPaymentCompletion");
    const lifecycle = read(`${domainDir}/multiCheckAllocationLifecycle.ts`);
    expect(lifecycle).toContain("IllegalTerminalTransitionError");
    expect(lifecycle).toContain("same AllocationId");
  });

  it("commands return Applied | AlreadyApplied | NoChange", () => {
    const cmds = read(`${domainDir}/multiCheckAllocationCommands.ts`);
    expect(cmds).toContain("MultiCheckAllocationCommandOutcome");
    expect(cmds).toContain('"applied"');
    expect(cmds).toContain('"already_applied"');
    expect(cmds).toContain('"no_change"');
    expect(cmds).toContain("ADR-021");
    expect(cmds).toContain("does not settle Checks");
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
      expect(src, `${file} must not mention SQL`).not.toMatch(/\bSQL\b/);
    }
  });

  it("is exported from Check and operational-session barrels", () => {
    const check = read("shared/operational-session/check/index.ts");
    const root = read("shared/operational-session/index.ts");
    expect(check).toContain("createMultiCheckAllocation");
    expect(check).toContain('from "./multiCheckAllocation"');
    expect(root).toContain("createMultiCheckAllocation");
    expect(root).toContain("MultiCheckAllocation");
  });

  it("does not claim Aggregate Root or own Order Settlement / settle Checks", () => {
    const contract = read(`${domainDir}/multiCheckAllocationContract.ts`);
    expect(contract).toContain("NOT an Aggregate Root");
    expect(contract).toContain("NOT a Payment");
    expect(contract).toContain("NOT a Check");
    const invariants = read(`${domainDir}/multiCheckAllocationInvariants.ts`);
    expect(invariants).toContain("I-MCA-09");
    expect(invariants).toContain("never imply Check Financial Settlement");
    expect(invariants).toContain("never mutates Order Settlement");
  });

  it("emits canonical domain event contracts", () => {
    const events = read(`${domainDir}/multiCheckAllocationEvents.ts`);
    for (const t of [
      "AllocationCreated",
      "AllocationReserved",
      "AllocationApplied",
      "AllocationAdjusted",
      "AllocationReversed",
      "AllocationCompleted",
      "AllocationCancelled",
      "AllocationResponsibilityTransferred",
      "AllocationOutstandingChanged",
    ]) {
      expect(events).toContain(`"${t}"`);
    }
  });

  it("implements financial conservation and domain error codes", () => {
    const money = read(`${domainDir}/multiCheckAllocationMoney.ts`);
    expect(money).toContain("I-MCA-01");
    expect(money).toContain("Allocated Value + Remaining Value");
    const errors = read(`${domainDir}/multiCheckAllocationErrors.ts`);
    for (const code of [
      "ALLOCATION_EXCEEDED",
      "INVALID_ALLOCATION_STATE",
      "INVALID_ALLOCATION_TRANSITION",
      "ALLOCATION_ALREADY_COMPLETED",
      "ALLOCATION_ALREADY_CANCELLED",
      "ALLOCATION_ALREADY_REVERSED",
      "FINANCIAL_CONSERVATION_VIOLATION",
      "NEGATIVE_RESPONSIBILITY",
    ]) {
      expect(errors).toContain(code);
    }
  });
});
