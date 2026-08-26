/**
 * CASHIER-REBUILD-1 — cashier pre-CONFIRM architecture guards.
 * Sale/Order is the invoice. OPEN Check is not created on pos.sale.create.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-REBUILD-1 cashier pre-CONFIRM architecture", () => {
  it("persists Order on sale.create and does not enroll an OPEN Check", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const os = read(
      "server/operational-session/check/checkOrderSettlementIntegration.ts"
    );
    const hook = sale.slice(
      sale.indexOf("afterPersistInTransaction: async"),
      sale.indexOf("enrollCheck: false")
    );
    expect(sale).toContain("enrollCheck: false");
    expect(sale).toContain("putInTransaction");
    expect(sale).toContain("POS_SALE_IDEMPOTENCY_UNASSIGNED_CHECK_ID");
    expect(sale).not.toContain("createAndEnrollCashierPosOpenCheckInTransaction");
    expect(sale).not.toContain("createOpenCheck");
    expect(sale).not.toContain("enrollOpenCheck");
    expect(sale).not.toContain("recalculateOrderSettlementsForCheck");
    expect(hook).toContain("persistSaleMappingInTransaction");
    expect(hook).not.toContain("enrollOpenCheck");
    expect(os).toContain("getOrderById(row.orderId, client)");
  });

  it("does not create Collection Fact or Confirm on the sale path", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(settle).toContain("confirmPayment");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(panel).toContain("trpc.pos.settlement.initiate");
    expect(panel).not.toContain("createAndEnrollCashierPosOpenCheckInTransaction");
    expect(sale).not.toContain("confirmPayment");
    expect(sale).not.toContain("pos.settlement.initiate");
    expect(sale).not.toContain("replaceItems");
    expect(sale).not.toContain("commitCollectionFact");
  });

  it("opens Payment UI from the local prepared invoice, not a persisted orderId", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const placeSaleFn = panel.slice(
      panel.indexOf("function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(placeSaleFn).toContain('setSalePhase("payment")');
    expect(placeSaleFn).not.toContain("saleMutation.mutateAsync");
    expect(placeSaleFn).not.toContain("result.checkId");
    expect(panel).not.toContain("directSale?.checkId");
  });

  it("leaves 0098 columns in place without treating leftover checkId as a Check", () => {
    const schema = read("drizzle/schema.ts");
    const sql = read("drizzle/0098_pos_sale_idempotency_open_check.sql");
    const journal = read("drizzle/meta/_journal.json");
    const store = read("server/pos/infrastructure/PosSaleIdempotencyStore.ts");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(sql).toContain("ADD COLUMN `checkId`");
    expect(schema).toContain("checkId: int().notNull()");
    expect(store).toContain("POS_SALE_IDEMPOTENCY_UNASSIGNED_CHECK_ID");
    expect(store).toContain("checkId: number");
    expect(store).toContain("lines:");
  });

  it("Confirm financial commit freezes Order and does not materialize Check first", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const check = read("server/operational-session/check/CheckService.ts");
    const freeze = read(
      "server/operational-session/payment/cashierPosOrderFreeze.ts"
    );
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const start = check.indexOf(
      "export async function settleCashierPosOrderPaidByIdDetailed"
    );
    const end = check.indexOf(
      "export async function settleCheckComplimentaryById",
      start
    );
    const cashier = check.slice(start, end);
    expect(freeze).toContain("getOrderItemsByOrderId");
    expect(freeze).toContain("computeCheckMoney");
    expect(freeze).toContain("checkId: null");
    expect(freeze).not.toContain("insertOperationalCheck");
    expect(cashier).toContain("freezeCashierPosPayableFromOrder");
    expect(cashier).toContain("productionCollectionCommit");
    expect(cashier).not.toContain("materializeOrLoadCashierPosOpenCheck");
    expect(cashier).not.toContain("enrollOrderInCheck");
    expect(cashier).not.toContain("recalculateOrderSettlementsForCheck");
    expect(confirm).toContain("commitCashierProductionCollectionFactInTransaction");
    expect(adapter).toContain("createDrizzleCollectionFactStore(tx)");
    expect(settle).toContain("finalizeCashierPreparedInvoice");
    expect(settle).not.toContain("check_already_terminal");
    expect(settle).toContain("posCheckIdFromFact");
  });
});
