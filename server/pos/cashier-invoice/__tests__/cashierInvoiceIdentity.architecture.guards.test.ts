/**
 * CASHIER-INVOICE-IDENTITY-IMPLEMENTATION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-INVOICE-IDENTITY-IMPLEMENTATION-1 architecture", () => {
  it("stores Cashier invoice identity independently of operational Order identity", () => {
    const sql = read("drizzle/0101_cashier_invoices.sql");
    const schema = read("drizzle/schema.ts");
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    expect(sql).toContain("cashier_invoice_sequences");
    expect(sql).toContain("cashier_invoices");
    expect(sql).toContain("PRIMARY KEY (`restaurantId`, `orderId`)");
    expect(sql).not.toContain("business_day");
    expect(sql).not.toContain("businessDay");
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(schema).toContain("export const cashierInvoiceSequences");
    expect(schema).toContain("export const cashierInvoices");
    expect(allocator).toContain("order_business_day_sequences");
    expect(allocator).not.toContain("cashier_invoice_sequences");
    expect(finalize).toContain("allocateCashierInvoiceForOrder");
    expect(finalize).not.toContain("identityScope = \"INVOICE\"");
    expect(finalize).toContain("identityScope = result.businessIdentity?.identityScope ?? \"POS\"");
  });

  it("allocates invoice identity at Confirm, not Send, Incoming open, or Invoice Intent", () => {
    const handoff = read("server/pos/cashier-handoff/CashierHandoffService.ts");
    const intent = read("server/pos/services/InvoiceIntentService.ts");
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    expect(handoff).not.toContain("allocateCashierInvoiceForOrder");
    expect(handoff).not.toContain("commitCollectionFact");
    expect(intent).not.toContain("allocateCashierInvoiceForOrder");
    expect(intent).not.toContain("commitCollectionFact");
    expect(panel).not.toContain("allocateCashierInvoiceForOrder");
    expect(confirm).toContain("commitCashierProductionCollectionFactInTransaction");
    expect(confirm).toContain("cashierInvoiceNumberForOrder");
    expect(adapter).toContain("allocateCashierInvoiceForOrder");
    expect(finalize).toContain("allocateCashierInvoiceForOrder");
    expect(finalize).toContain("commitCashierProductionCollectionFact");
  });

  it("does not create a second Order, Check, Collection Fact, or financial ledger", () => {
    const sql = read("drizzle/0101_cashier_invoices.sql");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const session = read("server/diningSession/sessionService.ts");
    const kitchen = read(
      "server/kitchen/read/services/KitchenReadService.ts"
    );
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/CREATE TABLE `operational_checks`/);
    expect(sql).not.toMatch(/CREATE TABLE `payment_collection_facts`/);
    expect(confirm).not.toContain("createOrder(");
    expect(confirm).not.toContain("insertOrder(");
    expect(confirm).not.toContain("closeSession");
    expect(adapter).toContain("commitCollectionFact");
    expect(session).not.toContain("allocateCashierInvoiceForOrder");
    expect(kitchen).not.toContain("allocateCashierInvoiceForOrder");
    expect(kitchen).not.toContain("cashier_invoices");
  });

  it("receipt and Cashier UI distinguish Invoice from Order", () => {
    const dialog = read(
      "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx"
    );
    const copy = read("client/src/lib/cashier-workspace/cashierCopy.ts");
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const projection = read(
      "server/operational-session/payment/cashierPaidReceiptProjection.ts"
    );
    expect(copy).toContain("receiptInvoiceNumber");
    expect(copy).toContain("receiptOrderNumber");
    expect(dialog).toContain('t("receiptInvoiceNumber")');
    expect(dialog).toContain('t("receiptOrderNumber")');
    expect(dialog).toContain("receipt.invoiceNumber");
    expect(dialog).toContain("receipt.displayReference");
    expect(panel).toContain('t("receiptOrderNumber")');
    expect(panel).not.toContain('t("invoiceNumber")');
    expect(projection).toContain("invoiceNumber: input.invoiceNumber?.trim() || null");
    expect(projection).toContain("resolveOrderDisplayIdentity");
  });
});
