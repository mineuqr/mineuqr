/**
 * CASHIER-ORDER-OPERATIONAL-ISOLATION-1 — dining membership vs Cashier/kitchen.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-ORDER-OPERATIONAL-ISOLATION-1 architecture guards", () => {
  it("keeps cashier_pos sessionless on Place and IdentityPlace", () => {
    const identity = read("server/order/application/IdentityPlaceOrderService.ts");
    const place = read("server/order/application/PlaceOrderService.ts");
    const sale = read("server/pos/services/PosSaleService.ts");
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");

    expect(identity).toContain("isCashierPosOrderingChannel(command.orderingChannel)");
    expect(identity).toContain('persistence: "ephemeral"');
    expect(identity).toContain("CASHIER_POS_TABLE_FORBIDDEN");
    expect(identity).not.toContain("getOrCreateSession");
    expect(identity).not.toContain("resolveSessionForOrderCreate");
    expect(place).toContain("CASHIER_POS_SESSION_FORBIDDEN");
    expect(place).toContain("CASHIER_POS_TABLE_FORBIDDEN");
    expect(sale).toContain("createStationFulfilmentAnchor");
    expect(sale).toContain("cashier_pos_session_forbidden");
    expect(sale).toContain("enrollCheck: false");
    expect(finalize).toContain("createStationFulfilmentAnchor");
    expect(finalize).toContain("enrollCheck: false");
    expect(finalize).not.toContain("getOrCreateSession");
  });

  it("excludes cashier_pos from Dining listActive and session operational counts", () => {
    const diningStore = read(
      "server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts"
    );
    const workspace = read("server/order/read/services/OrderReadWorkspaceService.ts");
    const posRead = read("server/pos/services/PosOrderReadService.ts");
    const kitchen = read("server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts");
    const board = read("server/ops/activeTablesBoard.ts");
    const db = read("server/db.ts");
    const router = read("server/order/read/orderReadRouter.ts");

    expect(workspace).toContain('cashierPosMembership: options?.cashierPosMembership ?? "exclude"');
    expect(diningStore).toContain("diningOperationalExcludeCashierPosSql()");
    expect(posRead).toContain('cashierPosMembership: "paid-visible"');
    expect(kitchen).toContain("cashierPosPaidOperationalVisibilitySql()");
    expect(board).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(db).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(router).not.toContain("cashierPosMembership");
    expect(existsSync(join(repoRoot, "drizzle/0101_cashier_order_operational_isolation.sql"))).toBe(
      false
    );
  });

  it("does not introduce a financial writer, ledger, or cashier session channel", () => {
    const identity = read("server/order/application/IdentityPlaceOrderService.ts");
    const visibility = read("server/order/read/cashierPosOperationalVisibility.ts");
    const sale = read("server/pos/services/PosSaleService.ts");
    expect(identity).not.toContain("commitCollectionFact");
    expect(identity).not.toContain("cashier_session");
    expect(visibility).not.toContain("cashier_session");
    expect(sale).not.toContain("commitCollectionFact");
    expect(sale).not.toContain("markPaid");
  });
});
