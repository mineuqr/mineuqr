/**
 * CASHIER-PAID-RECEIPT-SUBTOTAL-PRESENTATION-1 — presentation-only guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PROJECTION =
  "server/operational-session/payment/cashierPaidReceiptProjection.ts";
const INITIATE = "server/pos/services/PosSettlementInitiateService.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const COMMIT =
  "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts";
const MONEY = "shared/operational-session/check/checkMoney.ts";
const DIALOG =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";

describe("CASHIER-PAID-RECEIPT-SUBTOTAL-PRESENTATION-1 architecture guards", () => {
  it("reuses cashierInvoicePresentationSubtotal and does not copy freeze/CF.subtotal", () => {
    const projection = read(PROJECTION);
    expect(projection).toContain("CASHIER-PAID-RECEIPT-SUBTOTAL-PRESENTATION-1");
    expect(projection).toContain("cashierInvoicePresentationSubtotal");
    expect(projection).toContain("grandTotal: input.freeze.grandTotal");
    expect(projection).toContain("taxAmount: input.freeze.taxAmount");
    expect(projection).not.toContain("subtotal: input.freeze.subtotal");
    expect(projection).not.toContain("computeCheckMoney");
    expect(projection).not.toContain("taxPolicySnapshot");
    expect(projection).not.toContain("ratePercent");
    expect(read(DIALOG)).toContain("receipt.subtotal");
  });

  it("does not add Check, Settlement Record, or tax-engine work to the receipt projector", () => {
    const projection = read(PROJECTION);
    expect(projection).not.toContain("getCheckById");
    expect(projection).not.toContain("settlementRecord");
    expect(projection).not.toContain("findProductionCollectionFact");
    expect(projection).not.toContain("getOrderItemsByOrderId");
    expect(projection).not.toContain("getDb(");
    const initiate = read(INITIATE);
    expect(initiate).toContain("buildCashierPaidReceiptProjection");
    expect(initiate).toContain("subtotal: fact.subtotal");
    expect(initiate).not.toContain("subtotal: input.fact.subtotal");
    expect(read(CHECK)).toContain("buildCashierPaidReceiptProjection");
  });

  it("does not change Collection Fact writer or computeCheckMoney assignment", () => {
    const commit = read(COMMIT);
    const money = read(MONEY);
    expect(commit).toContain("subtotal: input.freeze.subtotal");
    expect(money).toContain("const subtotal = roundMoney(taxableBase)");
  });
});
