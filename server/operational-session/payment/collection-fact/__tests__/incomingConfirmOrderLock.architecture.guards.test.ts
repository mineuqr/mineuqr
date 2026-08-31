/**
 * INCOMING-CONFIRM-ORDER-LOCK-HARDENING-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("INCOMING-CONFIRM-ORDER-LOCK-HARDENING-1 architecture", () => {
  it("Incoming Invoice+CF transaction locks the Order before the CF decision", () => {
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    const lockFn = adapter.slice(
      adapter.indexOf("export async function lockOrderRowForIncomingConfirm"),
      adapter.indexOf("export async function runIncomingCashierCollectionFactTransaction")
    );
    const runFn = adapter.slice(
      adapter.indexOf("export async function runIncomingCashierCollectionFactTransaction"),
      adapter.indexOf("export async function commitCashierProductionCollectionFactInTransaction")
    );
    expect(confirm).toContain("commitCashierProductionCollectionFactInTransaction");
    expect(lockFn).toContain('.for("update")');
    expect(lockFn).toContain("orders.restaurantId");
    expect(lockFn).toContain("orders.id");
    expect(runFn.indexOf("lockOrderRowForIncomingConfirm")).toBeLessThan(
      runFn.indexOf("findProductionCollectionFactByOrderId")
    );
    expect(runFn.indexOf("findProductionCollectionFactByOrderId")).toBeLessThan(
      runFn.indexOf("allocateCashierInvoiceForOrder")
    );
    expect(runFn).toContain('outcome: "replayed"');
    expect(finalize).not.toContain("lockOrderRowForIncomingConfirm");
    expect(finalize).not.toContain("runIncomingCashierCollectionFactTransaction");
    expect(finalize).not.toContain("commitCashierProductionCollectionFactInTransaction");
    const check = read("server/operational-session/check/CheckService.ts");
    expect(check).not.toContain("lockOrderRowForIncomingConfirm");
  });

  it("does not add a CF unique migration or a second financial writer", () => {
    const journal = read("drizzle/meta/_journal.json");
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const schema = read("drizzle/schema.ts");
    expect(journal).toContain("0101_cashier_invoices");
    // Later migrations (0102+) are allowed; this program must not introduce a
    // CF uniqueness migration or a second financial writer.
    expect(journal).not.toMatch(/01\d\d_.*payment_collection_facts.*unique/i);
    expect(schema).toContain("index(\"payment_collection_facts_restaurant_order\")");
    expect(adapter).toContain("commitCollectionFact");
    expect(adapter).not.toContain("redis");
    expect(adapter).not.toContain("new Map");
  });
});
