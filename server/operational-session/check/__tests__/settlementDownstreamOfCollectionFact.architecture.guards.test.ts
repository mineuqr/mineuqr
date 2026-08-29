/**
 * SETTLEMENT-DOWNSTREAM-OF-COLLECTION-FACT-BOUNDARY-1
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SETTLEMENT-DOWNSTREAM-OF-COLLECTION-FACT-BOUNDARY-1", () => {
  it("paid-sale Settlement prefers unique production CF over Check freeze", () => {
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    expect(writer).toContain("resolveUniqueProductionCollectionFactForSettlement");
    expect(writer).toContain("settlementFinancialFactsFromCollectionFact");
    expect(writer).toContain("cfFacts?.grandTotal ?? input.freeze.grandTotal");
    expect(writer).not.toContain("allocateCashierInvoiceForOrder");
    expect(writer).not.toContain("commitCashierProductionCollectionFact");
  });

  it("Settlement read rematerializes Order display with persisted identityScope", () => {
    const readSvc = read(
      "server/operational-session/check/api/settlementRecordReadService.ts"
    );
    expect(readSvc).toContain("identityScope: order.identityScope ?? null");
    expect(readSvc).toContain("mapCashierInvoiceNumbersByOrderIds");
    expect(readSvc).toContain("settlementSourceChannelFromOrderingChannel");
  });

  it("does not write Invoice, CF, or PAID from Settlement surfaces", () => {
    const receipt = read(
      "server/operational-session/check/api/paidSaleReceiptResolution.ts"
    );
    expect(receipt).toContain("identityScope: order.identityScope ?? null");
    expect(receipt).not.toContain("allocateCashierInvoiceForOrder");
    expect(receipt).not.toContain("commitCollectionFact");
  });
});
