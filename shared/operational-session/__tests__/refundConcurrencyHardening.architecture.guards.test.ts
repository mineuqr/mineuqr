/**
 * REFUND-INVOICE-IDENTITY-AND-CONCURRENCY-HARDENING-1
 * Architecture guards: Invoice primary identity + concurrency conflict retry.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("Refund concurrency / identity hardening guards", () => {
  it("CheckService retries ConcurrentRefundGenerationError outside the failed TX", () => {
    const service = read("server/operational-session/check/CheckService.ts");
    expect(service).toContain("ConcurrentRefundGenerationError");
    expect(service).toContain("maxAttempts");
    expect(service).toContain("applyRefundOnCheckIntegration");
  });

  it("integration amount-matches duplicates and conflicts on amount mismatch", () => {
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).toContain("ConcurrentRefundGenerationError");
    expect(integration).toContain("amountsMatch");
    expect(integration).toContain("attemptApplyRefundOnCheck");
  });

  it("domain distinguishes same-amount already_applied from amount-mismatch conflict", () => {
    const cmds = read(
      "shared/operational-session/check/refund/refundCommands.ts"
    );
    expect(cmds).toContain("publishedAmount !== requestedAmount");
    expect(cmds).toContain("ConcurrentRefundGenerationError");
  });

  it("Recovery still cannot create compensating Refund records", () => {
    const recover = read(
      "server/operational-session/payment/recoverCashierPosDownstreamSettlement.ts"
    );
    expect(recover).not.toContain("createCompensatingSettlementRecord");
    expect(recover).not.toContain('recordKind: "refund"');
  });

  it("Refund apply path does not allocate Invoice or mutate CF", () => {
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).not.toContain("allocateCashierInvoiceForOrder");
    expect(integration).not.toContain("insertCollectionFact");
    expect(integration).not.toContain("updateCollectionFact");
  });
});
