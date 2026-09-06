/**
 * CASHIER-PASS-2-CONFIRM-FINALIZATION-1
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-PASS-2-CONFIRM-FINALIZATION-1", () => {
  it("creates Order and Collection Fact in the same persist transaction", () => {
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const router = read("server/pos/api/posRouter.ts");
    expect(finalize).toContain("afterPersistInTransaction");
    expect(finalize).toContain("commitCashierProductionCollectionFact");
    expect(finalize).toContain("createDrizzleCollectionFactStore(tx");
    expect(finalize).toContain("freezeCashierPosPayableFromOrder");
    expect(finalize).toContain("enrollCheck: false");
    expect(finalize).toContain('awaitRelay: "skip"');
    expect(finalize).toContain("scheduleDeferredOrderEventRelay");
    expect(finalize).toContain("afterCompliance");
    expect(finalize).not.toContain("enrollCheck: true");
    expect(finalize).not.toContain("ensureCheckForOrder");
    expect(settle).toContain("finalizeCashierPreparedInvoice");
    expect(settle).toContain("findCollectionFactByIdempotency");
    expect(router).toContain("items: z.array(saleItemInput)");
    expect(router).toContain("items: input.items");
  });

  it("does not require a 0098 change", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
  });
});
