/**
 * SPLIT-PAYMENT-DOMAIN-1 / ADR-ARCH-024 — architecture guards.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");
const domainDir = "shared/operational-session/check/splitPayment";

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

describe("SPLIT-PAYMENT-DOMAIN-1 architecture guards", () => {
  it("domain module exists under Check boundary", () => {
    const barrel = read(`${domainDir}/index.ts`);
    expect(barrel).toContain("SPLIT-PAYMENT-DOMAIN-1");
    expect(barrel).toContain("createSplitPayment");
    expect(barrel).toContain("IllegalTerminalTransitionError");
    expect(barrel).toContain("NOT an Aggregate Root");
  });

  it("implements canonical statuses and terminal protection", () => {
    const contract = read(`${domainDir}/splitPaymentContract.ts`);
    for (const s of [
      "pending",
      "authorized",
      "captured",
      "partially_applied",
      "applied",
      "cancelled",
      "voided",
      "refunded",
      "failed",
    ]) {
      expect(contract).toContain(`"${s}"`);
    }
    expect(contract).toContain("PaymentId");
    expect(contract).toContain("PaymentAttemptId");
    expect(contract).toContain("TenderAllocationId");
    expect(contract).toContain("PaymentReference");
    expect(contract).toContain("FinancialReference");
    expect(contract).toContain("impliesFinancialSettlement");
    const lifecycle = read(`${domainDir}/splitPaymentLifecycle.ts`);
    expect(lifecycle).toContain("IllegalTerminalTransitionError");
    expect(lifecycle).toContain("same PaymentId");
  });

  it("commands return Applied | AlreadyApplied | NoChange", () => {
    const cmds = read(`${domainDir}/splitPaymentCommands.ts`);
    expect(cmds).toContain("SplitPaymentCommandOutcome");
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
    expect(check).toContain("createSplitPayment");
    expect(check).toContain('from "./splitPayment"');
    expect(root).toContain("createSplitPayment");
    expect(root).toContain("SplitPayment");
  });

  it("does not claim Aggregate Root or auto-settlement", () => {
    const contract = read(`${domainDir}/splitPaymentContract.ts`);
    expect(contract).toContain("NOT an Aggregate Root");
    expect(contract).toContain("NOT Tender Aggregate Root");
    const invariants = read(`${domainDir}/splitPaymentInvariants.ts`);
    expect(invariants).toContain("I-SP-06");
    expect(invariants).toContain("must never imply Financial Settlement");
  });

  it("emits canonical domain event contracts", () => {
    const events = read(`${domainDir}/splitPaymentEvents.ts`);
    for (const t of [
      "PaymentCreated",
      "PaymentAuthorized",
      "PaymentCaptured",
      "PaymentApplied",
      "PaymentPartiallyApplied",
      "PaymentCancelled",
      "PaymentVoided",
      "PaymentRefunded",
      "PaymentFailed",
      "TenderAllocated",
      "OutstandingUpdated",
      "PaymentCompleted",
    ]) {
      expect(events).toContain(`"${t}"`);
    }
  });
});
