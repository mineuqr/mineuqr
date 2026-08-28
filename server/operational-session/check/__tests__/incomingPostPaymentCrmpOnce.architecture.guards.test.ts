/**
 * CASHIER-INCOMING-POSTPAYMENT-CRMP-DUPLICATE-CLEANUP-1
 * Incoming must not attribute CRMP immediately after CF. Direct and Incoming
 * converge on Check-finalize adoptSettlementAttributionAfterFinalize once.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sliceFn(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("CASHIER-INCOMING-POSTPAYMENT-CRMP-DUPLICATE-CLEANUP-1 architecture", () => {
  it("Incoming Confirm does not invoke CRMP before the shared Check finalizer", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const settle = sliceFn(
      check,
      "export async function settleCashierPosOrderPaidByIdDetailed",
      "export async function settleCheckComplimentaryById"
    );
    expect(settle).not.toContain("adoptSettlementAttributionAfterFinalize");
    expect(settle).toContain("deliverCashierPosOperationalSettlementAfterPaid");
  });

  it("Direct Confirm does not invoke CRMP; Check finalization remains canonical", () => {
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    const check = read("server/operational-session/check/CheckService.ts");
    const recover = read(
      "server/operational-session/payment/recoverCashierPosDownstreamSettlement.ts"
    );
    expect(finalize).not.toContain("adoptSettlementAttributionAfterFinalize");
    expect(finalize).toContain("deliverCashierPosOperationalSettlementAfterPaid");
    expect(check).toContain("adoptSettlementAttributionAfterFinalize");
    const finalizeOpen = sliceFn(
      check,
      "async function finalizeOpenCheckById",
      "export async function settleCheckComplimentaryById"
    );
    expect(finalizeOpen).toContain("adoptSettlementAttributionAfterFinalize");
    expect(recover).toContain("deliverCashierPosOperationalSettlementAfterPaid");
    expect(recover).not.toContain("adoptSettlementAttributionAfterFinalize");
  });

  it("does not change Invoice, CF, or PAID writers", () => {
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const invoice = read(
      "server/pos/cashier-invoice/cashierInvoiceRepository.ts"
    );
    expect(settle).toContain("finalizeCashierPreparedInvoice");
    expect(confirm).toContain("commitCashierProductionCollectionFactInTransaction");
    expect(adapter).toContain("commitCollectionFact");
    expect(invoice).toContain("export async function allocateCashierInvoiceForOrder");
  });
});
