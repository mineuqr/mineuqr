/**
 * ORDER-CARD-OPERATIONAL-PRINT-WINDOWS-1
 * Order Card Print → existing Windows Print Preview — not RLC / financial receipt.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getOperationalActionById,
  isPrintOrderAction,
} from "../operationalActions";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx";
const DIALOG =
  "client/src/components/orders-workspace/OperationalOrderTicketDialog.tsx";
const TICKET = "client/src/lib/operational-workspace/operationalOrderTicket.ts";
const ACTIONS = "client/src/lib/operational-workspace/useOrderStatusActions.ts";
const CASHIER =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";
const SETTLEMENT =
  "client/src/components/settlement-record/SettlementReceiptDialog.tsx";
const DRAWER =
  "client/src/lib/register-operations-presentation/shiftClosingPresentation.ts";

describe("ORDER-CARD-OPERATIONAL-PRINT-WINDOWS-1 architecture", () => {
  it("Print has no lifecycle target and is not a money action", () => {
    const print = getOperationalActionById("print-order");
    expect(print.targetStatus).toBeUndefined();
    expect(isPrintOrderAction("accept-order")).toBe(false);
    expect(isPrintOrderAction("cancel-order")).toBe(false);
    expect(isPrintOrderAction("send-to-cashier")).toBe(false);
  });

  it("Order Card Print opens the existing Windows Print Preview path", () => {
    const panel = read(PANEL);
    const dialog = read(DIALOG);
    const ticket = read(TICKET);
    expect(panel).toContain("isPrintOrderAction");
    expect(panel).toContain("OperationalOrderTicketDialog");
    expect(panel).toContain("setPrintOrderId(orderId)");
    expect(panel).toContain("toOperationalOrderTicketViewModel");
    expect(panel).not.toContain("usePrintOrderCommand");
    expect(panel).not.toContain("printOrderCommand");
    expect(panel).not.toContain("printWorkspace.commands.printOrder");
    expect(dialog).toContain("printOperationalOrderTicket");
    expect(ticket).toContain("window.print()");
    expect(ticket).toContain("function printOperationalOrderTicket");
    expect(ticket).toContain("OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS");
    expect(ticket).toContain("operationalDisplayReference");
    const printBranch = panel.slice(
      panel.indexOf("isPrintOrderAction(actionId)"),
      panel.indexOf("if (orderActionsRef.current.isPending)")
    );
    expect(printBranch).toContain("setPrintOrderId(orderId)");
    expect(printBranch).not.toContain("executeAction");
    expect(printBranch).not.toContain("updateStatus");
    expect(printBranch).not.toContain("sendToCashier");
    expect(printBranch).not.toContain("staffSettle");
    expect(printBranch).not.toContain("staffCancel");
    expect(printBranch).not.toContain("cancelSessionless");
    expect(printBranch).not.toContain("printOrderCommand");
    expect(printBranch).not.toContain("printWorkspace");
  });

  it("does not use RLC, Gateway, or a second print engine", () => {
    const panel = read(PANEL);
    const dialog = read(DIALOG);
    const ticket = read(TICKET);
    for (const src of [panel, dialog, ticket]) {
      expect(src).not.toContain("connector-gateway");
      expect(src).not.toContain("connector-local");
      expect(src).not.toContain("connector-session");
      expect(src).not.toContain("printOrderV2");
      expect(src).not.toContain("ESC/POS");
      expect(src).not.toContain("requestPrint");
      expect(src).not.toContain("buildPayloadForOrder");
    }
  });

  it("operational ticket has no financial or money document fields", () => {
    const dialog = read(DIALOG);
    const ticket = read(TICKET);
    expect(dialog).toContain("orderReference");
    expect(dialog).toContain("tableOrChannelLabel");
    expect(dialog).toContain("orderTimeLabel");
    expect(dialog).toContain("item.quantity");
    expect(dialog).not.toContain("unitPrice");
    expect(dialog).not.toContain("subtotal");
    expect(dialog).not.toContain("grandTotal");
    expect(dialog).not.toContain("invoiceNumber");
    expect(dialog).not.toContain("documentNumber");
    expect(dialog).not.toContain("paymentMethod");
    expect(dialog).not.toContain("tender");
    expect(ticket).not.toContain("unitPrice");
    expect(ticket).not.toContain("subtotal");
    expect(ticket).not.toContain("invoice");
    expect(ticket).not.toContain("settlement");
    expect(ticket).not.toContain("collectionFact");
    expect(ticket).not.toContain("markPaid");
  });

  it("lifecycle executeAction refuses to map Print onto order.updateStatus", () => {
    const actions = read(ACTIONS);
    expect(actions).toContain('if (actionId === "print-order"');
    expect(actions).not.toMatch(/"print-order":\s*\{\s*targetStatus/);
    expect(actions).toContain("trpc.order.updateStatus.useMutation");
  });

  it("does not reuse financial receipt dialogs as the Order Ticket renderer", () => {
    const panel = read(PANEL);
    const dialog = read(DIALOG);
    expect(panel).not.toContain("SettlementReceiptDialog");
    expect(panel).not.toContain("CashierPaidReceiptDialog");
    expect(dialog).not.toContain("SettlementReceipt");
    expect(dialog).not.toContain("CashierPaidReceipt");
    expect(dialog).not.toContain("printInvoice");
  });

  it("leaves existing Cashier, Settlement, and Drawer print paths unchanged", () => {
    expect(read(CASHIER)).toContain("window.print()");
    expect(read(CASHIER)).toContain("cashier-paid-receipt-print");
    expect(read(SETTLEMENT)).toContain("window.print()");
    expect(read(SETTLEMENT)).toContain("settlement-receipt-print");
    expect(read(DRAWER)).toContain("window.print()");
    expect(read(DRAWER)).toContain("SHIFT_CLOSING_PRINT_BODY_CLASS");
    expect(read(CASHIER)).not.toContain("OperationalOrderTicket");
    expect(read(SETTLEMENT)).not.toContain("OperationalOrderTicket");
    expect(read(DRAWER)).not.toContain("OperationalOrderTicket");
  });
});
