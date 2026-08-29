/**
 * CHECK-FINALIZE-PAYABLE-ISOLATION-1
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-FINALIZE-PAYABLE-ISOLATION-1", () => {
  it("resolves current paid-sale Settlement money per enrolled Order", () => {
    const facts = read(
      "server/operational-session/check/settlementPaidSaleFinancialFacts.ts"
    );
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    expect(facts).toContain("resolveProductionCollectionFactsByEnrolledOrders");
    expect(facts).toContain("settlementFinancialFactsFromOrderResolutions");
    expect(writer).toContain("resolvePaidSaleSettlementFinancialFacts");
    expect(writer).not.toContain("facts.length !== 1");
    expect(facts).not.toMatch(/if \(facts\.length !== 1\) return null/);
  });

  it("does not let Check-wide CF cardinality suppress a valid Order CF", () => {
    const facts = read(
      "server/operational-session/check/settlementPaidSaleFinancialFacts.ts"
    );
    expect(facts).toContain("byOrder.get(fact.orderId)");
    expect(facts).toContain('if (!bucket) continue');
    expect(facts).toContain("resolution.status === \"unique\"");
  });

  it("Settlement must not write Invoice, CF, or PAID", () => {
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    const facts = read(
      "server/operational-session/check/settlementPaidSaleFinancialFacts.ts"
    );
    expect(writer).not.toContain("allocateCashierInvoiceForOrder");
    expect(writer).not.toContain("commitCashierProductionCollectionFact");
    expect(facts).not.toContain("allocateCashierInvoiceForOrder");
    expect(facts).not.toContain("commitCollectionFact");
    expect(facts).not.toContain("insertCollectionFact");
  });

  it("uses Order CF over Check freeze when exact CF exists", () => {
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    expect(writer).toContain("cfFacts?.grandTotal ?? input.freeze.grandTotal");
    expect(writer).toContain("resolvePaidSaleSettlementFinancialFacts");
  });
});
