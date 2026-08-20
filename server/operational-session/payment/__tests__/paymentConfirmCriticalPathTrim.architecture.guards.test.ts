/**
 * PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1
 * Guard the Cashier Confirm trim: reuse POS CRMP context; keep in-TX Charge SUM;
 * keep SR + OS + ST + Check PAID in one money TX; do not await Attribution.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1 architecture", () => {
  it("Cashier Confirm forwards pre-resolved SettlementContext into confirmPayment", () => {
    const pos = read("server/pos/services/PosSettlementInitiateService.ts");
    const payment = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const settlePaid = pos.slice(
      pos.indexOf("async function defaultSettlePaid"),
      pos.indexOf("function unexplainedFinancialTxnGapMs")
    );
    expect(pos).toContain("requireResolvedContextForSettlement");
    expect(settlePaid).toContain("settlementContext: input.settlementContext");
    expect(settlePaid).toContain("awaitAttribution: false");
    expect(settlePaid).not.toContain("resolveSettlementContextForSettle");
    expect(payment).toContain("settlementContext: command.settlementContext");
    expect(payment).not.toContain("resolveSettlementContextForSettle");
    expect(payment).not.toContain("loadChargesSubtotal");
    expect(payment).not.toContain("createSettlementRecordForCheckFinalize");
  });

  it("keeps in-TX Charge SUM, OS, ST, and SR inside the Check money TX", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const start = check.indexOf("const moneyTxStartedAt = Date.now();");
    const end = check.indexOf(
      "const moneyTxMs = elapsedSinceMs(moneyTxStartedAt);"
    );
    const moneySlice = check.slice(start, end);
    expect(moneySlice).toContain("loadChargesSubtotal(");
    expect(moneySlice).toContain("finalizeCheckOutcome");
    expect(moneySlice).toContain("insertSettlementTransactions");
    expect(moneySlice).toContain("applyFullSettlementToCheckOrders");
    expect(moneySlice).toContain("createSettlementRecordForCheckFinalize");
    expect(moneySlice).not.toContain("ensureOpenCheckChargesSubtotal");
    expect(moneySlice).not.toContain("resolveSettlementContextForSettle");
    expect(moneySlice).not.toContain("adoptSettlementAttributionAfterFinalize");
  });

  it("does not split the financial TX, move money to React, or add a payments table", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(panel).not.toContain("finalizeCheckOutcome");
    expect(panel).not.toContain("computeCheckMoney");
    expect(schema).not.toMatch(/export const payments\b/);
    expect(journal).toContain("0095_check_charges");
    expect(journal).toContain("0096_payment_collection_facts");
    expect(journal).not.toContain("0096_payments");
  });
});
