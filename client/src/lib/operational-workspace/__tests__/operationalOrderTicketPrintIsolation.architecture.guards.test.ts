/**
 * ORDER-CARD-PRINT-ONE-PAGE-LAYOUT-FIX-1
 * Print root is isolated; Cashier / Settlement / Drawer CSS stay unchanged.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS,
  OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID,
} from "../operationalOrderTicket";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const CSS = "client/src/index.css";
const TICKET = "client/src/lib/operational-workspace/operationalOrderTicket.ts";
const DIALOG =
  "client/src/components/orders-workspace/OperationalOrderTicketDialog.tsx";
const CASHIER =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";
const SETTLEMENT =
  "client/src/components/settlement-record/SettlementReceiptDialog.tsx";
const DRAWER =
  "client/src/lib/register-operations-presentation/shiftClosingPresentation.ts";

describe("ORDER-CARD-PRINT-ONE-PAGE-LAYOUT-FIX-1 architecture", () => {
  it("scopes print isolation to a body class and one ticket root", () => {
    const css = read(CSS);
    const ticket = read(TICKET);
    const dialog = read(DIALOG);
    expect(css).toContain("ORDER-CARD-PRINT-ONE-PAGE-LAYOUT-FIX-1");
    expect(css).toContain(`body.${OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS}`);
    expect(css).toContain(`#${OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID}`);
    expect(css).toContain(
      `> *:not(:has(#${OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID})):not(#${OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID})`
    );
    expect(css).toContain("display: none !important");
    expect(css).toContain("min-height: 0 !important");
    expect(css).toContain("[data-slot=\"dialog-overlay\"]");
    expect(css).toContain("[data-slot=\"dialog-close\"]");
    expect(ticket).toContain("OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS");
    expect(ticket).toContain("classList.add");
    expect(ticket).toContain("afterprint");
    expect(ticket).toContain("window.print()");
    expect(dialog).toContain(`id={OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID}`);
    expect(dialog.match(/id=\{OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID\}/g)?.length).toBe(
      1
    );
    expect(dialog).toContain("print:hidden");
    expect(dialog).not.toContain("unitPrice");
    expect(dialog).not.toContain("window.print()");
  });

  it("does not change Cashier, Settlement, or Drawer print implementations", () => {
    const css = read(CSS);
    expect(css).toContain("FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1");
    expect(css).toContain("body.printing-shift-closing");
    expect(css).toContain("#cashier-paid-receipt-print");
    expect(read(CASHIER)).toContain("window.print()");
    expect(read(CASHIER)).not.toContain("printing-operational-order-ticket");
    expect(read(SETTLEMENT)).toContain("window.print()");
    expect(read(SETTLEMENT)).not.toContain("printing-operational-order-ticket");
    expect(read(DRAWER)).toContain("SHIFT_CLOSING_PRINT_BODY_CLASS");
    expect(read(DRAWER)).not.toContain("printing-operational-order-ticket");
    expect(read(DRAWER)).not.toContain("OperationalOrderTicket");
  });

  it("does not touch connector, lifecycle, or financial writers", () => {
    const ticket = read(TICKET);
    const dialog = read(DIALOG);
    for (const src of [ticket, dialog]) {
      expect(src).not.toContain("updateStatus");
      expect(src).not.toContain("collectionFact");
      expect(src).not.toContain("markPaid");
      expect(src).not.toContain("connector-gateway");
      expect(src).not.toContain("requestPrint");
    }
  });
});
