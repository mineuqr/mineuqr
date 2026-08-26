/**
 * CASHIER-DISCOUNT-NORMALIZATION-FALSE-POSITIVE-FIX-1 — architecture guards.
 * NORMALIZATION ≠ OVERFLOW. Cap remains catalog/charges, not presentation Subtotal.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const MONEY = "client/src/lib/cashier-workspace/cashierTicketMoney.ts";

describe("CASHIER-DISCOUNT-NORMALIZATION-FALSE-POSITIVE-FIX-1 architecture", () => {
  it("toasts discountExceeds only on numeric catalog overflow, not string normalize", () => {
    const panel = read(PANEL);
    const money = read(MONEY);
    expect(panel).toContain("cashierDiscountExceedsCatalogSubtotal");
    expect(panel).toContain("toast.error(t(\"discountExceeds\"))");
    expect(panel).not.toContain("next !== discountDraft.trim()");
    expect(money).toContain("NORMALIZATION ≠ OVERFLOW");
    expect(money).toContain("discountCents > subtotalCents");
  });

  it("keeps the Apply overflow cap on ticketTotal / catalog charges, not presentation Subtotal", () => {
    const panel = read(PANEL);
    const applyStart = panel.indexOf("cashierDiscountExceedsCatalogSubtotal(");
    expect(applyStart).toBeGreaterThan(-1);
    const applySlice = panel.slice(applyStart, applyStart + 220);
    expect(applySlice).toContain("ticketTotal");
    expect(applySlice).not.toContain("invoiceView.money");
    expect(applySlice).not.toContain("sheetMoney");
    expect(panel).toContain("clampCashierDiscountAmount(\n                          discountDraft,\n                          ticketTotal");
  });
});
