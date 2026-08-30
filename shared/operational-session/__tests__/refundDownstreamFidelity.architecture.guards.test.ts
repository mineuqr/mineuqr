/**
 * REFUND-DOWNSTREAM-FIDELITY-AND-CUSTODY-HARDENING-1
 * Architecture guards: multi-tender fidelity, tax snapshot, custody fail-open + Shift window.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("Refund downstream fidelity / custody guards", () => {
  it("paymentSnapshot prefers original tenders over client tenderMethod", () => {
    const alloc = read(
      "shared/operational-session/check/refund/refundTenderAllocation.ts"
    );
    expect(alloc).toContain("allocateRefundAcrossTenders");
    expect(alloc).toContain("Prefer original-sale tenders");
    const cmds = read(
      "shared/operational-session/check/refund/refundCommands.ts"
    );
    expect(cmds).toContain("buildRefundPaymentSnapshotLines");
    expect(cmds).toContain("originalTenders");
  });

  it("reverse snapshot uses proportional tax from original sale basis", () => {
    const tax = read(
      "shared/operational-session/check/refund/refundTaxSnapshot.ts"
    );
    expect(tax).toContain("buildRefundReverseSnapshot");
    expect(tax).toContain("Full refund: mirror original tax composition exactly");
    const cmds = read(
      "shared/operational-session/check/refund/refundCommands.ts"
    );
    expect(cmds).toContain("originalTaxBasis");
  });

  it("drawer attribution remains post-commit fail-open with retry", () => {
    const service = read("server/operational-session/check/CheckService.ts");
    expect(service).toContain("adoptRefundAttributionAfterFinalize");
    expect(service).toContain("Custody remains post-commit");
    expect(service).toContain("attributionAttempt");
    // Must not share Check money TX with CRMP attribution.
    const applyBlock = service.slice(
      service.indexOf("export async function applyRefundOnCheck")
    );
    expect(applyBlock).toContain("withCheckOwnedTransaction");
    expect(applyBlock.indexOf("withCheckOwnedTransaction")).toBeLessThan(
      applyBlock.indexOf("adoptRefundAttributionAfterFinalize")
    );
  });

  it("refund attribution requires event instant inside Shift window", () => {
    const adopt = read(
      "server/operational-session/check/checkSettlementAttributionAdoption.ts"
    );
    expect(adopt).toContain("collectionFactCommitFallsInShiftWindow");
    expect(adopt).toContain("refund_event_outside_shift_window");
    expect(adopt).toContain("adoptRefundAttributionAfterFinalize");
  });

  it("refund path does not mutate Invoice or Collection Fact", () => {
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).not.toContain("allocateCashierInvoiceForOrder");
    expect(integration).not.toContain("insertCollectionFact");
    expect(integration).not.toContain("updateCollectionFact");
  });
});
