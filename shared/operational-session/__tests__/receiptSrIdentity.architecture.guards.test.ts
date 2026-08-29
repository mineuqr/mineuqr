/**
 * RECEIPT-SR-IDENTITY-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("RECEIPT-SR-IDENTITY-1 architecture", () => {
  it("current Cashier paid receipt resolves through CF/order identity, not gen=1 SR", () => {
    const resolver = read(
      "server/operational-session/check/api/paidSaleReceiptResolution.ts"
    );
    const service = read(
      "server/operational-session/check/api/settlementRecordReadService.ts"
    );
    const cashierPrint = read(
      "server/operational-session/payment/cashierPaidReceiptProjection.ts"
    );
    expect(resolver).toContain("listProductionCollectionFactsByOrderId");
    expect(resolver).not.toContain("findProductionCollectionFactByOrderId");
    expect(resolver).not.toContain("findSettlementRecordById");
    expect(service).toContain("resolvePaidSaleReceiptFromCollectionFact");
    expect(service).toContain("settlementRecordId.length > 0");
    expect(cashierPrint).toContain("buildCashierPaidReceiptProjection");
    expect(cashierPrint).not.toContain("settlementRecordId");
  });

  it("historical receipt may still resolve through Settlement Record", () => {
    const service = read(
      "server/operational-session/check/api/settlementRecordReadService.ts"
    );
    expect(service).toContain("toSettlementRecordReceiptDto(detail)");
    expect(service).toContain("this.getById");
  });

  it("refund receipts remain independent SR/RF documents", () => {
    const identity = read(
      "server/operational-session/check/api/settlementRecordDocumentIdentity.ts"
    );
    expect(identity).toContain('documentType: "refund"');
    expect(identity).toContain("RF-");
    const service = read(
      "server/operational-session/check/api/settlementRecordReadService.ts"
    );
    expect(service).toContain("record.recordKind === \"refund\"");
    expect(service).toContain("findRefundDocumentSequenceByRecordId");
  });

  it("CF remains financial SSOT and receipt reads do not create financial records", () => {
    const map = read("shared/pos/financialResponsibilityMap.ts");
    expect(map).toContain("Collection Fact.amount");
    expect(map).toContain("paidSaleReceipt");
    expect(map).toContain("Collection Fact / orderId");
    const resolver = read(
      "server/operational-session/check/api/paidSaleReceiptResolution.ts"
    );
    const service = read(
      "server/operational-session/check/api/settlementRecordReadService.ts"
    );
    for (const src of [resolver, service]) {
      expect(src).not.toContain("insertSettlementRecord");
      expect(src).not.toContain("commitCollectionFact");
      expect(src).not.toContain("commitCashierProductionCollectionFact");
      expect(src).not.toContain("markOrderPaid");
      expect(src).not.toContain("createSettlementRecord(");
    }
  });

  it("public receipt remains tenant-scoped and token-gated", () => {
    const routers = read("server/routers.ts");
    const publicBlock = routers.slice(
      routers.indexOf("getSettlementReceipt: publicProcedure"),
      routers.indexOf("listUnpaidCounterPickup: verifiedProcedure")
    );
    expect(publicBlock).toContain("assertPublicOrderingRestaurant");
    expect(publicBlock).toContain("trackingToken");
    expect(publicBlock).toContain("order.restaurantId !== input.restaurantId");
    expect(publicBlock).toContain("receipt.orders.some");
    expect(publicBlock).toContain("settlementRecordId?.trim()");
  });

  it("multiple Collection Facts fail closed and query errors are not legacy fallback", () => {
    const resolver = read(
      "server/operational-session/check/api/paidSaleReceiptResolution.ts"
    );
    expect(resolver).toContain("AmbiguousPaidSaleReceiptError");
    expect(resolver).toContain("unique.size > 1");
    expect(resolver).toContain("Query failure must propagate");
    expect(resolver).toContain("unique.size === 0");
    const errors = read(
      "server/operational-session/check/api/mapSettlementRecordApiError.ts"
    );
    expect(errors).toContain("AmbiguousPaidSaleReceiptError");
    expect(errors).toContain('code: "CONFLICT"');
  });

  it("does not introduce a new ledger, delete SR, stop gen=1 writer, or add 0101", () => {
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    expect(writer).toContain("createSettlementRecordForCheckFinalize");
    expect(existsSync(join(repoRoot, "drizzle/0098_pos_sale_idempotency_open_check.sql"))).toBe(
      true
    );
    expect(existsSync(join(repoRoot, "drizzle/0099_cashier_order_handoffs.sql"))).toBe(
      true
    );
    expect(existsSync(join(repoRoot, "drizzle/0100_crmp_collection_fact_attribution.sql"))).toBe(
      true
    );
    expect(existsSync(join(repoRoot, "drizzle/0101_paid_sale_receipt.sql"))).toBe(
      false
    );
    const repo = read(
      "server/operational-session/payment/collection-fact/collectionFactRepository.ts"
    );
    const listFn = repo.slice(
      repo.indexOf("export async function listProductionCollectionFactsByOrderId"),
      repo.indexOf("export async function listProductionCollectionFactsForRefundAnchor")
    );
    expect(listFn).not.toContain(".limit(");
    expect(listFn).toContain("COLLECTION_FACT_PRODUCTION_PURPOSE");
  });

  it("CF-only receipt does not alias Invoice serial as Settlement number", () => {
    const resolver = read(
      "server/operational-session/check/api/paidSaleReceiptResolution.ts"
    );
    expect(resolver).toContain("RECEIPT-HISTORICAL-FIDELITY-AND-INVOICE-IDENTITY-1");
    expect(resolver).toContain('settlementNumber: ""');
    expect(resolver).toContain('documentNumber: ""');
    expect(resolver).toContain("receiptItemsFromCollectionFactComposition");
    expect(resolver).not.toContain("getOrderItemsByOrderId");
    expect(resolver).not.toMatch(/settlementNumber:\s*documentNumber/);
  });

  it("SR-keyed receipt prefers frozen CF composition over live Order items", () => {
    const service = read(
      "server/operational-session/check/api/settlementRecordReadService.ts"
    );
    expect(service).toContain("receiptItemsFromCollectionFactComposition");
    expect(service).toContain("listProductionCollectionFactsByOrderId");
    expect(service).toContain("enrichLiveOrderItems");
    const dialog = read(
      "client/src/components/settlement-record/SettlementReceiptDialog.tsx"
    );
    expect(dialog).toContain("window.print()");
    expect(dialog).toContain("toSettlementReceiptViewModel");
    expect(dialog).toContain("vm.documentNumber ?");
  });

  it("staff getReceipt accepts orderId without requiring settlementRecordId", () => {
    const router = read(
      "server/operational-session/check/api/settlementRecordReadRouter.ts"
    );
    expect(router).toContain("settlementRecordId or orderId required");
    expect(router).toContain("receiptInput");
    const hook = read(
      "client/src/lib/settlement-record-presentation/useSettlementRecordQueries.ts"
    );
    expect(hook).toContain("orderId?: number | null");
    const dialog = read(
      "client/src/components/settlement-record/SettlementReceiptDialog.tsx"
    );
    expect(dialog).toContain("orderId?: number | null");
  });
});
