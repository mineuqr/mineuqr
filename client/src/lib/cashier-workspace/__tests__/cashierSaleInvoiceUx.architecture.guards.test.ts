/**
 * CASHIER-SALE-INVOICE-UX-REALIGNMENT-1 — presentation guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cashierUiLabel } from "../cashierCopy";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const VIEW = "client/src/lib/cashier-workspace/cashierInvoiceView.ts";
const STORAGE = "client/src/lib/cashier-workspace/cashierDirectSaleStorage.ts";
const COPY = "client/src/lib/cashier-workspace/cashierCopy.ts";

describe("CASHIER-SALE-INVOICE-UX-REALIGNMENT-1 architecture guards", () => {
  it("retains sale.create money and lines as the prepared invoice", () => {
    const panel = read(PANEL);
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(placeSaleFn).toContain("result.money");
    expect(placeSaleFn).toContain("result.lines");
    expect(placeSaleFn).toContain("result.displayReference");
    expect(placeSaleFn).toContain("result.createdAt");
    expect(placeSaleFn).toContain("mapSaleCreateLinesToInvoiceLines(result.lines, ticket)");
    expect(placeSaleFn).toContain("setDirectSale(sale)");
    expect(placeSaleFn.indexOf("saleMutation.mutateAsync")).toBeLessThan(
      placeSaleFn.indexOf('setSalePhase("payment")')
    );
    expect(read(VIEW)).toContain("buildPreparedCashierInvoiceView");
    expect(read(STORAGE)).toContain("invoice?:");
    expect(read(STORAGE)).toContain("v: 1 | 2");
    expect(panel).toContain("invoice: {");
  });

  it("keeps the left SALE/INVOICE visible after persist and after cancel", () => {
    const panel = read(PANEL);
    expect(panel).toContain('t("saleInvoice")');
    expect(panel).toContain("invoiceView.lines.map");
    expect(panel).toContain("buildPreparedCashierInvoiceView");
    expect(panel).not.toContain('t("ticket")');
    expect(cashierUiLabel("saleInvoice", "en")).toBe("Sale / Invoice");
    expect(cashierUiLabel("invoiceNew", "ar")).toBe("فاتورة جديدة");
    expect(read(COPY)).not.toMatch(/saleInvoice: \{ ar: "البيع الحالي"/);

    const cancelFn = panel.slice(
      panel.indexOf("function cancelPaymentSheet"),
      panel.indexOf("function resumePaymentSheet")
    );
    expect(cancelFn).toContain('setSalePhase("ticket")');
    expect(cancelFn).toContain("catalogTicketFromInvoiceLines");
    expect(cancelFn).toContain('persistDirectSaleSnapshot({ phase: "ticket" })');
    expect(cancelFn).not.toContain("setDirectSale(null)");
    expect(cancelFn).not.toContain("setTicket([])");
    expect(cancelFn).not.toContain("setPaidReceipt");
    expect(cancelFn).not.toContain("mutateAsync");
  });

  it("Payment UI consumes the prepared invoice and Confirm still commits via settlement.initiate", () => {
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    const startNewSaleFn = panel.slice(
      panel.indexOf("function startNewSale"),
      panel.indexOf("function cancelPaymentSheet")
    );
    expect(panel).toContain("sheetMoney = invoiceView.money");
    expect(panel).not.toContain("orderCheck?.subtotal");
    expect(completeFn).toContain("settleMutation.mutateAsync");
    expect(completeFn).toContain("result.paidReceipt");
    expect(completeFn).not.toContain("ticketLines: ticket");
    expect(completeFn).not.toContain("if (paid.settlementRecordId)");
    expect(startNewSaleFn).not.toContain("setPaidReceipt");
    expect(startNewSaleFn).not.toContain("setPrintOpen");
    expect(panel).not.toContain("replaceItems");
    expect(panel).not.toContain("trpc.pos.sale.replace");
  });
});
