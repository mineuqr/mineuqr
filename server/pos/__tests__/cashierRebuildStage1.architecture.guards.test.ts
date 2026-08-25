/**
 * CASHIER-REBUILD-1 Stage 1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-REBUILD-1 Stage 1 architecture", () => {
  it("writes OPEN Check on the Order persist transaction client", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const check = read("server/operational-session/check/CheckService.ts");
    const membership = read(
      "server/operational-session/check/checkMembershipService.ts"
    );
    const charges = read(
      "server/operational-session/check/checkChargeComposition.ts"
    );
    const os = read(
      "server/operational-session/check/checkOrderSettlementIntegration.ts"
    );
    const hook = sale.slice(
      sale.indexOf("afterPersistInTransaction: async"),
      sale.indexOf("enrollCheck: false")
    );
    expect(sale).toContain("createAndEnrollCashierPosOpenCheckInTransaction");
    expect(sale).toContain("captureSnapshotsFromBusinessSettings");
    expect(sale).toContain("outcome: \"open\"");
    expect(sale).toContain("checkId");
    expect(sale).toContain("enrollCheck: false");
    expect(hook).toContain("this.enrollOpenCheck");
    expect(hook).toContain("persistSaleMappingInTransaction");
    expect(hook.indexOf("this.enrollOpenCheck")).toBeLessThan(
      hook.indexOf("persistSaleMappingInTransaction")
    );
    expect(sale).toContain("putInTransaction");
    expect(check).toContain("export async function createAndEnrollCashierPosOpenCheckInTransaction");
    expect(check).toContain("client: tx");
    expect(membership).toContain("getOrderById(input.orderId, client)");
    expect(charges).toContain("getOrderById(input.orderId, client)");
    expect(charges).toContain("getOrderItemsByOrderId(order.id, client)");
    expect(os).toContain("getOrderById(input.orderId, client)");
    expect(os).toContain("getOrderById(row.orderId, client)");
    expect(os).not.toMatch(/getOrderById\(row\.orderId\)\s*;/);
  });

  it("does not create a Check on the payment path in this stage", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(settle).not.toContain("createAndEnrollCashierPosOpenCheckInTransaction");
    expect(confirm).not.toContain("createAndEnrollCashierPosOpenCheckInTransaction");
    expect(panel).not.toContain("createAndEnrollCashierPosOpenCheckInTransaction");
    expect(panel).toContain("trpc.pos.settlement.initiate");
    expect(sale).not.toContain("confirmPayment");
    expect(sale).not.toContain("pos.settlement.initiate");
    expect(sale).not.toContain("replaceItems");
    expect(sale).not.toContain("commitCollectionFact");
  });

  it("opens Payment only after sale.create returns an OPEN checkId", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(placeSaleFn.indexOf("saleMutation.mutateAsync")).toBeLessThan(
      placeSaleFn.indexOf('setSalePhase("payment")')
    );
    expect(placeSaleFn).toContain("result.checkId");
    expect(placeSaleFn).toContain('result.outcome !== "open"');
  });

  it("stores check identity on sale idempotency for replay", () => {
    const schema = read("drizzle/schema.ts");
    const sql = read("drizzle/0098_pos_sale_idempotency_open_check.sql");
    const journal = read("drizzle/meta/_journal.json");
    const store = read("server/pos/infrastructure/PosSaleIdempotencyStore.ts");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(sql).toContain("ADD COLUMN `checkId`");
    expect(schema).toContain("checkId: int().notNull()");
    expect(store).toContain("checkId: number");
    expect(store).toContain("lines:");
  });
});
