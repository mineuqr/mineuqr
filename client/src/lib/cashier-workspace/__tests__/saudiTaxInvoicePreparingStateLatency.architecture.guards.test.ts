/**
 * CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1", () => {
  it("defers POS invalidations until Tax Invoice READY for Saudi Cashier", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(panel).toContain("saudiTaxInvoiceInvalidatePendingRef");
    expect(panel).toContain("modalOpenToReadyMs");
    expect(panel).toContain(
      "if (!(isSaudiCashier && result.orderId))"
    );
  });

  it("prefers background Tax Invoice row before read-path ensure", () => {
    const view = read(
      "server/compliance/saudi-tax-invoice/saudiTaxInvoicePhase1ViewService.ts"
    );
    expect(view).toContain("waitForSaudiTaxInvoiceRow");
    expect(view).toContain("READ_PATH_WAIT_FOR_BACKGROUND_MS");
    expect(view).toContain("ensureSaudiTaxInvoiceRowForOrderRead");
  });

  it("single-flights ensure and re-checks Phase 1 before allocate", () => {
    const service = read(
      "server/compliance/saudi-tax-invoice/saudiTaxInvoiceService.ts"
    );
    const phase1 = read(
      "server/compliance/saudi-tax-invoice/saudiPhase1GenerationService.ts"
    );
    const alloc = read(
      "server/compliance/saudi-tax-invoice/saudiTaxInvoiceNumberAllocator.ts"
    );
    expect(service).toContain("runSaudiTaxInvoiceEnsureSingleFlight");
    expect(phase1).toContain("findSaudiTaxInvoiceByTaxInvoiceId");
    expect(alloc).toContain("FOR UPDATE");
  });
});
