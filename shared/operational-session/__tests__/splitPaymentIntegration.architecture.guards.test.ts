/**
 * SPLIT-PAYMENT-INTEGRATION-1 / ADR-ARCH-024 — integration architecture guards.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listTsFiles(dir: string): string[] {
  const abs = join(repoRoot, dir);
  const out: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...listTsFiles(rel));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(rel);
    }
  }
  return out;
}

describe("SPLIT-PAYMENT-INTEGRATION-1 architecture guards", () => {
  it("Check Aggregate owns transaction boundary and Split Payment orchestration", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("SPLIT-PAYMENT-INTEGRATION-1");
    expect(svc).toContain("withCheckOwnedTransaction");
    expect(svc).toContain("createPaymentOnCheck");
    expect(svc).toContain("applyPaymentOnCheck");
    expect(svc).toContain("createSplitPaymentOnCheck");
    expect(svc).toContain("applySplitPaymentOnCheck");
    expect(svc).toContain("db.transaction");
    expect(svc).not.toContain("insertSplitPayment(");
    expect(svc).not.toContain("updateSplitPayment(");
  });

  it("integration module routes Domain → Repository and OS Aggregate only", () => {
    const integ = read(
      "server/operational-session/check/checkSplitPaymentIntegration.ts"
    );
    expect(integ).toContain("SPLIT-PAYMENT-INTEGRATION-1");
    expect(integ).toContain("createSplitPayment");
    expect(integ).toContain("allocatePayment");
    expect(integ).toContain("insertSplitPayment");
    expect(integ).toContain("updateSplitPayment");
    expect(integ).toContain("applyPartialSettlementForOrder");
    expect(integ).toContain("ensureOrderSettlementForEnrollment");
    expect(integ).toContain("already_applied");
    expect(integ).toContain("no_change");
    expect(integ).toContain("SessionDbClient");
    expect(integ).not.toContain("EventBus");
    expect(integ).not.toContain("outbox");
    expect(integ).not.toContain("inbox");
    expect(integ).not.toContain(".transaction(");
    expect(integ).not.toContain("check_order_settlements");
    expect(integ).not.toContain("updateOrderSettlement");
  });

  it("insertSplitPayment is not imported outside Check Aggregate surface", () => {
    const allowed = new Set([
      "server/operational-session/check/checkSplitPaymentIntegration.ts",
      "server/operational-session/check/splitPaymentRepository.ts",
      "server/operational-session/check/index.ts",
    ]);
    const violators: string[] = [];
    for (const file of listTsFiles("server")) {
      if (file.includes("__tests__")) continue;
      if (allowed.has(file)) continue;
      const src = read(file);
      if (
        src.includes("insertSplitPayment") ||
        src.includes("updateSplitPayment(")
      ) {
        violators.push(file);
      }
    }
    expect(violators).toEqual([]);
  });

  it("atomicity: applyPayment orchestrates Payment + OS in one client path", () => {
    const integ = read(
      "server/operational-session/check/checkSplitPaymentIntegration.ts"
    );
    expect(integ).toContain("applyNewAllocationsToOrderSettlements");
    expect(integ).toContain("withOutstandingEvent");
    expect(integ).toContain("Atomicity");
  });

  it("does not redesign Domain or Persistence in this program", () => {
    const domainCmd = read(
      "shared/operational-session/check/splitPayment/splitPaymentCommands.ts"
    );
    expect(domainCmd).toContain("SPLIT-PAYMENT-DOMAIN-1");
    const migration = read("drizzle/0074_check_split_payments.sql");
    expect(migration).toContain("SPLIT-PAYMENT-PERSISTENCE-1");
  });
});
