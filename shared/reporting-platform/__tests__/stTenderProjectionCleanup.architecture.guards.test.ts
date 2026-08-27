/**
 * ST-TENDER-PROJECTION-CLEANUP-1 — captured analytics SSOT is CF tendersJson.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ST-TENDER-PROJECTION-CLEANUP-1 architecture", () => {
  it("published payment-method captured tenders prefer Collection Fact", () => {
    const service = read(
      "server/reporting-platform/PaymentMethodAnalyticsService.ts"
    );
    expect(service).toContain("listProductionCollectionFactTenderLinesForReporting");
    expect(service).toContain("mergeCapturedTenderLinesPreferringCollectionFact");
    expect(service).toContain("tendersJson");
    expect(service).toContain("listRefundSettlementRecordPaymentLinesForReporting");
    expect(service).not.toMatch(
      /return \{ rows: srTenders, refundRows \}/
    );
  });

  it("ST remains a Check finalize writer and cannot create CF or PAID", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const stRepo = read(
      "server/operational-session/check/settlementTransactionRepository.ts"
    );
    const cf = read(
      "server/operational-session/payment/collection-fact/CollectionFactService.ts"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(check).toContain("insertSettlementTransactions");
    expect(stRepo).toContain("export async function insertSettlementTransactions");
    expect(cf).not.toContain("insertSettlementTransactions");
    expect(cf).toContain("commitCollectionFact");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).not.toContain("insertSettlementTransactions");
  });

  it("does not create migration 0100 or alter 0098/0099", () => {
    expect(existsSync(join(repoRoot, "drizzle/0100_st_tender.sql"))).toBe(false);
    expect(read("drizzle/0098_pos_sale_idempotency_open_check.sql")).toContain(
      "ADD COLUMN `checkId` int NOT NULL"
    );
    expect(read("drizzle/0099_cashier_order_handoffs.sql")).toContain(
      "CREATE TABLE `cashier_order_handoffs`"
    );
  });
});
