/**
 * REFUND-METHOD-SELECTION-HOTFIX-1 — tender option property contract.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listMonetaryPaymentMethodOptions } from "../../settlementPaymentMethodPresentation";

const repoRoot = join(__dirname, "../../../../../");

describe("REFUND-METHOD-SELECTION-HOTFIX-1", () => {
  it("monetary options expose paymentMethod (not value)", () => {
    const options = listMonetaryPaymentMethodOptions("ar");
    expect(options.map((o) => o.paymentMethod)).toEqual(["cash", "card"]);
    expect(options.every((o) => !("value" in o))).toBe(true);
    expect(options[0]?.label).toBeTruthy();
  });

  it("ledger refund dialog binds tender via paymentMethod", () => {
    const src = readFileSync(
      join(
        repoRoot,
        "client/src/components/settlement-record/SettlementLedgerRefundDialog.tsx"
      ),
      "utf8"
    );
    expect(src).toContain("setTender(opt.paymentMethod)");
    expect(src).toContain("tender === opt.paymentMethod");
    expect(src).toContain("key={opt.paymentMethod}");
    expect(src).not.toContain("opt.value");
  });
});
