/**
 * CASHIER-SALE-INVOICE-TAX-PROJECTION-1 — sale.create tax projection guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-SALE-INVOICE-TAX-PROJECTION-1 architecture", () => {
  it("projects sale.create money through computeCheckMoney without a second tax engine", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    expect(sale).toContain("projectCashierSaleInvoiceMoney");
    expect(sale).toContain("computeCheckMoney");
    expect(sale).toContain("captureTaxPolicySnapshot");
    expect(sale).toContain("scope.taxSettings");
    expect(sale).not.toContain("taxAmount: \"0.00\"");
    expect(sale).not.toContain("getOrderById");
    expect(sale).not.toContain("enrollCheck: true");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).not.toContain("createOpenCheck");
    expect(sale).not.toContain("createAndEnrollCashierPosOpenCheckInTransaction");
  });

  it("reuses the restaurant row already loaded for POS scope", () => {
    const scope = read("server/pos/authorization/assertRestaurantPosScope.ts");
    expect(scope).toContain("taxSettings");
    expect(scope).toContain("getRestaurantById");
    const sale = read("server/pos/services/PosSaleService.ts");
    expect(sale).not.toContain("getRestaurantById");
  });
});
