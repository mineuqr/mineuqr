/**
 * CHECK-RESIDUAL-FINANCIAL-REFERENCE-CLEANUP-1
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-RESIDUAL-FINANCIAL-REFERENCE-CLEANUP-1", () => {
  it("keeps computeCheckMoney operational and off current paid-sale SR write", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    const facts = read(
      "server/operational-session/check/settlementPaidSaleFinancialFacts.ts"
    );
    expect(svc).toContain("computeCheckMoney");
    expect(writer).not.toContain("computeCheckMoney");
    expect(facts).not.toContain("computeCheckMoney");
    expect(writer).toContain("resolvePaidSaleSettlementFinancialFacts");
    expect(writer).toContain("cfFacts?.grandTotal ?? input.freeze.grandTotal");
  });

  it("treats financialReference as Settlement correlation, not Financial Core", () => {
    const identity = read(
      "shared/operational-session/check/settlementRecord/settlementRecordIdentity.ts"
    );
    const contract = read(
      "shared/operational-session/check/settlementRecord/settlementRecordContract.ts"
    );
    const receiptDto = read(
      "server/operational-session/check/api/settlementRecordApiDtos.ts"
    );
    expect(identity).toContain("fin:check:${input.checkId}:gen:${input.recordGeneration}");
    expect(identity).toContain("Do not treat this as Invoice, CF, PAID");
    expect(contract).toContain("Not Invoice serial, Collection Fact id, PAID identity");
    expect(receiptDto).not.toContain("financialReference");
  });

  it("does not write Invoice, CF, or PAID from Settlement / Check finalize integration", () => {
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    const facts = read(
      "server/operational-session/check/settlementPaidSaleFinancialFacts.ts"
    );
    for (const src of [writer, facts]) {
      expect(src).not.toContain("allocateCashierInvoiceForOrder");
      expect(src).not.toContain("commitCollectionFact");
      expect(src).not.toContain("commitCashierProductionCollectionFact");
      expect(src).not.toContain("markOrderPaid");
    }
  });

  it("preserves identityScope and source channel from Order, not Check", () => {
    const receipt = read(
      "server/operational-session/check/api/paidSaleReceiptResolution.ts"
    );
    const source = read(
      "server/operational-session/check/api/settlementSourceChannel.ts"
    );
    expect(receipt).toContain("identityScope: order.identityScope ?? null");
    expect(source).toContain("Settlement Source is derived from Order.orderingChannel");
    expect(source).toContain('return "counter"');
    expect(source).toContain('return "table_order"');
    expect(source).toContain('return "waiter_order"');
    expect(source).toContain('return "self_order"');
  });

  it("keeps current paid Drawer and Reports CF-first", () => {
    const adoption = read(
      "server/operational-session/check/checkSettlementAttributionAdoption.ts"
    );
    const recover = read(
      "server/operational-session/payment/recoverCollectionFactDrawerAttribution.ts"
    );
    const union = read(
      "shared/reporting-platform/revenue-union/revenueUnionResolver.ts"
    );
    expect(adoption).toContain("adoptCollectionFactAttributionAfterPaid");
    expect(adoption).toContain("settlementRecordId: null");
    expect(recover).toContain("settlementRecord: null");
    expect(union).toContain(
      "Production Collection Fact wins proven economic overlap"
    );
  });
});
