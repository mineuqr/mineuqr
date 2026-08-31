/**
 * CUSTOMER-FOUNDATION-1 — Cashier customer creation completion guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CUSTOMER-FOUNDATION-1 cashier customer creation", () => {
  it("exposes Add Customer action alongside Select in Cashier bar", () => {
    const bar = read(
      "client/src/components/cashier-workspace/CashierCustomerBar.tsx"
    );
    expect(bar).toContain("إضافة عميل");
    expect(bar).toContain("Add customer");
    expect(bar).toContain("اختيار");
    expect(bar).toContain("Select");
    expect(bar).toContain("createForPos");
    expect(bar).toContain("createOpen");
    expect(bar).toContain("Dialog");
    expect(bar).toContain("min-h-11");
  });

  it("Cashier create uses POS-scoped createForPos → CustomerService.createCustomer", () => {
    const router = read("server/customer/customerRouter.ts");
    expect(router).toContain("createForPos");
    expect(router).toContain("assertRestaurantPosScope");
    expect(router).toContain('"customer.createForPos"');
    const createForPosBlock = router.slice(
      router.indexOf("createForPos:"),
      router.indexOf("update:")
    );
    expect(createForPosBlock).toContain("createCustomer(input");
    expect(createForPosBlock).toContain("assertRestaurantPosScope");
    expect(createForPosBlock).not.toContain("assertRestaurantAccess");
  });

  it("Management create remains assertRestaurantAccess (not replaced by POS-only)", () => {
    const router = read("server/customer/customerRouter.ts");
    const createBlock = router.slice(
      router.indexOf("create: verifiedProcedure"),
      router.indexOf("createForPos:")
    );
    expect(createBlock).toContain("assertRestaurantAccess");
    expect(createBlock).toContain('"customer.create"');
  });

  it("creation dialog supports Individual, Business, optional taxNumber", () => {
    const bar = read(
      "client/src/components/cashier-workspace/CashierCustomerBar.tsx"
    );
    expect(bar).toContain('value="individual"');
    expect(bar).toContain('value="business"');
    expect(bar).toContain("taxNumber");
    expect(bar).toContain("optional");
    expect(bar).not.toContain('countryCode === "SA"');
    expect(bar).not.toContain("B2B");
    expect(bar).not.toContain("B2C");
    expect(bar).not.toContain("zatca");
    expect(bar).not.toContain("ZATCA");
  });

  it("on success selects customer without financial mutations", () => {
    const bar = read(
      "client/src/components/cashier-workspace/CashierCustomerBar.tsx"
    );
    expect(bar).toContain("onSelect({ id: customer.id");
    expect(bar).toContain("setCreateOpen(false)");
    expect(bar).not.toContain("settleMutation");
    expect(bar).not.toContain("completePayment");
    expect(bar).not.toContain("commitCashierProductionCollectionFact");
    expect(bar).not.toContain("confirmPayment");
    expect(bar).not.toContain("saleMutation");
    expect(bar).not.toContain("setTicket(");
    expect(bar).not.toContain("setTicketDiscount");
    expect(bar).not.toContain("setPaymentMethod");
  });

  it("Cashier panel keeps selectedCustomer local and clears without inventing نقدًا row", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(panel).toContain("selectedCustomer");
    expect(panel).toContain("setSelectedCustomer(null)");
    expect(panel).not.toContain('displayName: "نقدًا"');
    expect(panel).not.toContain('displayName: "Cash"');
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    // SALE-CUSTOMER-LINK-1 — Confirm may pass customerId; must not mutate money.
    expect(completeFn).toContain("customerId");
    expect(completeFn).not.toContain("setTicketDiscount");
    expect(completeFn).not.toContain("commitCashierProductionCollectionFact");
  });

  it("no new Customer migration beyond 0105 for this completion", () => {
    const sql = read("drizzle/0105_customers.sql");
    expect(sql).toContain("displayName");
    expect(sql).toContain("customerType");
    expect(sql).toContain("taxNumber");
    expect(sql).toContain("phone");
    expect(sql).toContain("email");
    expect(sql).toContain("address");
  });
});
