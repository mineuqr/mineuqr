/**
 * ORDERS-CASHIER-POS-VISIBILITY-REGRESSION-FIX-1
 * Orders Workspace paid-visible cashier_pos vs Dining/Incoming exclude.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERS-CASHIER-POS-VISIBILITY-REGRESSION-FIX-1", () => {
  it("Orders Workspace listActive requests paid-visible; Dining exclude is not the router rule", () => {
    const router = read("server/order/read/orderReadRouter.ts");
    const listActive = router.slice(
      router.indexOf("listActive: verifiedProcedure"),
      router.indexOf("getDetail:")
    );
    expect(listActive).toContain('cashierPosMembership: "paid-visible"');
    expect(listActive).not.toContain("diningOperationalExcludeCashierPosSql");
    expect(listActive).not.toMatch(/listActive\(input\)\s*;/);
  });

  it("does not hide cashier_pos in Orders Workspace client membership", () => {
    const panel = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    const items = panel.slice(
      panel.indexOf("const items = useMemo"),
      panel.indexOf("useGracePeriod")
    );
    expect(panel).toContain("trpc.order.read.listActive.useQuery");
    expect(items).not.toContain("cashier_pos");
    expect(items).not.toContain("orderingChannel");
  });

  it("keeps Dining Session, Incoming, and Kitchen membership boundaries", () => {
    const posRead = read("server/pos/services/PosOrderReadService.ts");
    const kitchen = read("server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts");
    const board = read("server/ops/activeTablesBoard.ts");
    const db = read("server/db.ts");
    const handoff = read("server/pos/cashier-handoff/CashierHandoffService.ts");
    const visibility = read("server/order/read/cashierPosOperationalVisibility.ts");

    expect(posRead).toContain('cashierPosMembership: "exclude"');
    expect(posRead).not.toContain('cashierPosMembership: "paid-visible"');
    expect(kitchen).toContain("cashierPosPaidOperationalVisibilitySql()");
    expect(board).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(db).toContain("ne(orders.orderingChannel, ORDERING_CHANNEL_CASHIER_POS)");
    expect(handoff).toContain("Direct Cashier sales are not Incoming Queue items");
    expect(visibility).toContain("diningOperationalExcludeCashierPosSql");
    expect(visibility).toContain("cashierPosPaidOperationalVisibilitySql");
  });

  it("does not touch Cashier Core, invoice identity, or add a migration", () => {
    const confirm = read("server/operational-session/payment/PaymentConfirmService.ts");
    const invoice = read("server/pos/cashier-invoice/cashierInvoiceRepository.ts");
    const router = read("server/order/read/orderReadRouter.ts");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(invoice).toContain("allocateCashierInvoiceForOrder");
    expect(router).not.toContain("commitCollectionFact");
    expect(router).not.toContain("allocateCashierInvoiceForOrder");
    expect(existsSync(join(repoRoot, "drizzle/0102_orders_cashier_pos_visibility.sql"))).toBe(
      false
    );
  });
});
