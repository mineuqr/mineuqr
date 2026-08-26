/**
 * CASHIER-POST-PAYMENT-PRINT-UX-1 — paid receipt copy must exist on COPY.
 * cashierUiLabel does COPY[key][language]; a missing row throws on .ar / .en.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cashierUiLabel } from "../cashierCopy";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const COPY = "client/src/lib/cashier-workspace/cashierCopy.ts";
const DIALOG =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";

const RECEIPT_COPY_KEYS = [
  "receiptTitle",
  "receiptItems",
  "receiptClose",
  "receiptInvoiceNumber",
  "receiptDate",
  "receiptTime",
  "receiptCashier",
  "receiptQty",
  "receiptUnitPrice",
  "receiptVat",
  "receiptPaidStamp",
] as const;

describe("CASHIER-POST-PAYMENT-PRINT-UX-1 paid receipt copy", () => {
  it("defines receiptTitle, receiptItems, and receiptClose on COPY with ar and en", () => {
    const copy = read(COPY);
    const dialog = read(DIALOG);
    for (const key of RECEIPT_COPY_KEYS) {
      expect(dialog).toContain(`t("${key}")`);
      expect(copy).toMatch(
        new RegExp(`${key}: \\{ ar: "[^"]+", en: "[^"]+" \\}`)
      );
      expect(cashierUiLabel(key, "ar").length).toBeGreaterThan(0);
      expect(cashierUiLabel(key, "en").length).toBeGreaterThan(0);
    }
  });
});
