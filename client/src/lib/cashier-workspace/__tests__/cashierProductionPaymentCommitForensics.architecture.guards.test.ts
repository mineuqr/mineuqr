/**
 * CASHIER-PRODUCTION-PAYMENT-COMMIT-FORENSICS-1
 * Read-only forensic guards. Do not change runtime behavior.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sliceCompletePayment(panel: string): string {
  const start = panel.indexOf("async function completePayment()");
  const end = panel.indexOf("function returnToDashboard()");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return panel.slice(start, end);
}

describe("CASHIER-PRODUCTION-PAYMENT-COMMIT-FORENSICS-1", () => {
  it("Cashier HTTP still does not await ST / OS / SR after Collection Fact", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const check = read("server/operational-session/check/CheckService.ts");
    const start = check.indexOf(
      "export async function settleCashierPosOrderPaidByIdDetailed"
    );
    const end = check.indexOf(
      "export async function settleCheckComplimentaryById",
      start
    );
    const cashier = check.slice(start, end);
    expect(confirm).toContain("deferOperationalSettlementAfterCollectionFact: true");
    expect(cashier).toContain("void completeCashierOperationalSettlementAfterCollectionFact");
    expect(cashier).not.toContain(
      "await completeCashierOperationalSettlementAfterCollectionFact"
    );
  });

  it("unknown-result recovery treats an OPEN Check as payment not recorded", () => {
    const recovery = read(
      "client/src/lib/cashier-workspace/cashierSettlementRecovery.ts"
    );
    expect(recovery).toContain('if (evaluated.status === "open")');
    expect(recovery).toContain(
      'return { kind: "PAYMENT_NOT_CONFIRMED", reason: "open" }'
    );
    expect(recovery).not.toContain("collectionFactId");
    expect(recovery).not.toContain("findProductionCollectionFactByCheckId");
  });

  it("success toast is HTTP result; error copy is recoveryNotCommitted; rediscovery awaits after HTTP", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const copy = read("client/src/lib/cashier-workspace/cashierCopy.ts");
    const complete = sliceCompletePayment(panel);
    expect(copy).toContain('paidSuccess: { ar: "تم الدفع بنجاح"');
    expect(copy).toContain('confirmPayment: { ar: "تأكيد الدفع"');
    expect(copy).toContain(
      'ar: "لم يُسجَّل الدفع. يمكنك المحاولة مرة أخرى."'
    );
    const tryBlock = complete.slice(complete.indexOf("try {"));
    const httpAt = tryBlock.indexOf("await settleMutation.mutateAsync");
    const rediscoverAt = tryBlock.indexOf("await rediscoverSettlementRecordId");
    const successAt = tryBlock.indexOf("toast.success");
    const notCommittedAt = tryBlock.indexOf('t("recoveryNotCommitted")');
    expect(httpAt).toBeGreaterThan(-1);
    expect(rediscoverAt).toBeGreaterThan(httpAt);
    expect(successAt).toBeGreaterThan(rediscoverAt);
    expect(notCommittedAt).toBeGreaterThan(successAt);
  });

  it("HTTP still awaits POS idempotency store after settle; Vercel has no waitUntil", () => {
    const pos = read("server/pos/services/PosSettlementInitiateService.ts");
    const settleAt = pos.indexOf("settled = await this.settlePaid");
    const putAt = pos.indexOf("await this.idempotency.put", settleAt);
    expect(settleAt).toBeGreaterThan(-1);
    expect(putAt).toBeGreaterThan(settleAt);
    expect(pos).toContain('outcome: "paid"');
    const vercel = read("scripts/vercel-handler.ts");
    expect(vercel).not.toContain("waitUntil");
    expect(vercel).not.toContain("startCashierDownstreamSettlementRecoveryWorker");
  });

  it("error-path retry keeps paymentIntent; success startNewSale clears it", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const complete = sliceCompletePayment(panel);
    const startNew = panel.slice(
      panel.indexOf("function startNewSale()"),
      panel.indexOf("function cancelPaymentSheet()")
    );
    expect(startNew).toContain("paymentIntentRef.current = null");
    expect(startNew).toContain("settleKeyRef.current = null");
    const notCommitted = complete.slice(
      complete.indexOf('t("recoveryNotCommitted")')
    );
    expect(notCommitted).not.toContain("paymentIntentRef.current = null");
  });

  it("payment-method buttons do not call tRPC; Vercel does not start the recovery worker", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const methodClick = panel.slice(
      panel.indexOf('["cash", "tenderCash"]'),
      panel.indexOf("tenderMode === \"cash\" || tenderMode === \"mixed\"")
    );
    expect(methodClick).toContain("setTenderMode(mode)");
    expect(methodClick).not.toContain("mutateAsync");
    expect(methodClick).not.toContain("trpc.");
    const boot = read("server/_core/index.ts");
    const vercel = read("scripts/vercel-handler.ts");
    expect(boot).toContain("if (!process.env.VERCEL)");
    expect(boot).toContain("startCashierDownstreamSettlementRecoveryWorker");
    expect(vercel).not.toContain("startCashierDownstreamSettlementRecoveryWorker");
  });

  it("does not introduce 0098, a payments table, or a second financial authority", () => {
    const journal = read("drizzle/meta/_journal.json");
    const schema = read("drizzle/schema.ts");
    expect(journal).not.toContain("0098");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(schema).toContain("export const paymentCollectionFacts");
  });
});
