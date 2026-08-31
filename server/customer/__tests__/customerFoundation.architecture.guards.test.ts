/**
 * CUSTOMER-FOUNDATION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CUSTOMER-FOUNDATION-1 architecture guards", () => {
  it("Customer Core is country-agnostic and has no Saudi branching", () => {
    const contract = read("shared/customer/customerContract.ts");
    const validation = read("shared/customer/customerValidation.ts");
    const service = read("server/customer/CustomerService.ts");
    const combined = contract + validation + service;
    expect(combined).not.toContain('countryCode === "SA"');
    expect(combined).not.toContain("saudiVatNumber");
    expect(combined).not.toContain("zatca");
    expect(combined).not.toContain("ZATCA");
    expect(combined).not.toContain("saudiZatca");
    expect(combined).not.toContain("requireFeature");
  });

  it("Customer does not import Saudi Tax Profile or Compliance module implementations", () => {
    const service = read("server/customer/CustomerService.ts");
    const router = read("server/customer/customerRouter.ts");
    const repo = read("server/customer/customerRepository.ts");
    const combined = service + router + repo;
    expect(combined).not.toContain("saudiTaxProfile");
    expect(combined).not.toContain("saudiZatcaComplianceModule");
    expect(combined).not.toContain("resolveComplianceModule");
  });

  it("Customer cannot create or mutate Collection Fact / PAID / settlement", () => {
    const service = read("server/customer/CustomerService.ts");
    const repo = read("server/customer/customerRepository.ts");
    const combined = service + repo;
    expect(combined).not.toContain("commitCollectionFact");
    expect(combined).not.toContain("commitCashierProductionCollectionFact");
    expect(combined).not.toContain("confirmPayment");
    expect(combined).not.toContain("settleCashier");
    expect(combined).not.toContain("tax_invoice");
    expect(combined).not.toContain("taxInvoice");
    expect(combined).not.toContain("allocateIrn");
    expect(combined).not.toContain("fatoora");
  });

  it("Collection Fact and PaymentConfirm do not depend on Customer domain", () => {
    const commit = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(commit).not.toContain("@shared/customer");
    expect(commit).not.toContain("customers");
    expect(confirm).not.toContain("@shared/customer");
    expect(confirm).not.toContain("CustomerService");
  });

  it("taxNumber is optional in Customer schema and contract", () => {
    const sql = read("drizzle/0105_customers.sql");
    const contract = read("shared/customer/customerContract.ts");
    expect(sql).toContain("`taxNumber` varchar(64) DEFAULT NULL");
    expect(contract).toContain("taxNumber: string | null");
    expect(contract).toContain("Optional");
  });

  it("نقدًا is display-only — not a seeded Customer", () => {
    const contract = read("shared/customer/customerContract.ts");
    const sql = read("drizzle/0105_customers.sql");
    expect(contract).toContain("CASHIER_ANONYMOUS_CUSTOMER_LABEL");
    expect(contract).toContain("NOT a persisted Customer");
    expect(sql).not.toContain("نقدًا");
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
  });

  it("Customer Management UI is global — not Saudi Customers", () => {
    const ui = read("client/src/components/dashboard/CustomersTab.tsx");
    expect(ui).toContain("Customers");
    expect(ui).not.toContain("Saudi Customers");
    expect(ui).not.toContain("Saudi Customer Management");
    expect(ui).toContain("taxNumber");
    expect(ui).toContain("optional");
  });

  it("Cashier customer bar does not alter financial confirm path", () => {
    const bar = read(
      "client/src/components/cashier-workspace/CashierCustomerBar.tsx"
    );
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(bar).toContain("Does not mutate Collection Fact");
    expect(bar).not.toContain("settleMutation");
    expect(bar).not.toContain("completePayment");
    expect(bar).toContain("createForPos");
    expect(bar).toContain("إضافة عميل");
    expect(panel).toContain("CashierCustomerBar");
    expect(panel).toContain("selectedCustomer");
  });

  it("Cashier createForPos reuses CustomerService — no duplicated create logic in UI", () => {
    const router = read("server/customer/customerRouter.ts");
    const bar = read(
      "client/src/components/cashier-workspace/CashierCustomerBar.tsx"
    );
    expect(router).toContain("createForPos");
    expect(router).toContain("from \"./CustomerService\"");
    expect(bar).toContain("trpc.customer.createForPos");
    expect(bar).not.toContain("insertCustomer");
    expect(bar).not.toContain("validateCustomerCreate");
  });
  it("Customer type does not encode invoice classification", () => {
    const contract = read("shared/customer/customerContract.ts");
    expect(contract).toContain('["individual", "business"]');
    expect(contract).not.toContain("B2B");
    expect(contract).not.toContain("B2C");
    expect(contract).not.toContain("Simplified Tax Invoice");
  });

  it("tenant scoping is enforced in repository queries", () => {
    const repo = read("server/customer/customerRepository.ts");
    expect(repo).toContain("eq(customers.restaurantId, restaurantId)");
    expect(repo).toContain("eq(customers.restaurantId, filter.restaurantId)");
  });
});
