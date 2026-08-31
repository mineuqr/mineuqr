/**
 * SALE-CUSTOMER-LINK-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SALE-CUSTOMER-LINK-1 architecture guards", () => {
  it("0106 adds nullable orders.customerId with SET NULL FK", () => {
    const sql = read("drizzle/0106_orders_customer_id.sql");
    expect(sql).toContain("ADD COLUMN `customerId`");
    expect(sql).toContain("ON DELETE SET NULL");
    expect(sql).toContain("REFERENCES `customers`");
    expect(sql).not.toContain("ON DELETE CASCADE");
  });

  it("Sale-Customer link has no Saudi branching or Tax Invoice coupling", () => {
    const link = read("server/customer/saleCustomerLink.ts");
    const setOrder = read("server/order/application/setOrderSaleCustomerId.ts");
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    const combined = link + setOrder + finalize;
    expect(combined).not.toContain('countryCode === "SA"');
    expect(combined).not.toContain("B2B");
    expect(combined).not.toContain("B2C");
    expect(combined).not.toContain("InvoiceClassification");
    expect(combined).not.toContain("zatca");
    expect(combined).not.toContain("ZATCA");
    expect(combined).not.toContain("TaxInvoice");
  });

  it("customerId attach does not write Collection Fact or payment totals", () => {
    const setOrder = read("server/order/application/setOrderSaleCustomerId.ts");
    expect(setOrder).toContain("customerId");
    expect(setOrder).toContain("update(orders)");
    expect(setOrder).not.toContain("commitCollectionFact");
    expect(setOrder).not.toContain("commitCashierProductionCollectionFact");
    expect(setOrder).not.toContain("grandTotal");
    expect(setOrder).not.toContain("confirmPayment");
  });

  it("schema documents customerId as non-classification metadata", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("SALE-CUSTOMER-LINK-1");
    expect(schema).toContain("customerId: int()");
    expect(schema).toContain("Does NOT determine invoice type");
  });

  it("Cashier Confirm passes customerId without inventing نقدًا Customer", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(panel).toContain("customerId: selectedCustomer.id");
    expect(panel).toContain("customerId: null");
    expect(panel).not.toContain('displayName: "نقدًا"');
  });
});
