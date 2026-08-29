/**
 * ORDER-CARD-PRINT-ACTION-1 — Print is not Accept, Cancel, payment, or Settlement.
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

describe("ORDER-CARD-PRINT-ACTION-1 architecture", () => {
  it("Print has no lifecycle target and is not a money action", () => {
    const print = getOperationalActionById("print-order");
    expect(print.targetStatus).toBeUndefined();
    expect(isPrintOrderAction("accept-order")).toBe(false);
    expect(isPrintOrderAction("cancel-order")).toBe(false);
    expect(isPrintOrderAction("send-to-cashier")).toBe(false);
  });

  it("Order Card Print reuses printWorkspace.commands.printOrder", () => {
    const panel = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    const hook = read("client/src/lib/print-workspace/usePrintWorkspaceActions.ts");
    expect(hook).toContain("trpc.printWorkspace.commands.printOrder.useMutation");
    expect(panel).toContain("isPrintOrderAction");
    expect(panel).toContain("printOrderCommand.printOrder");
    expect(panel).toContain("formatPrintOrderCommandError");
    const printBranch = panel.slice(
      panel.indexOf("isPrintOrderAction(actionId)"),
      panel.indexOf("if (orderActionsRef.current.isPending)")
    );
    expect(printBranch).toContain("printOrderCommand.printOrder");
    expect(printBranch).not.toContain("executeAction");
    expect(printBranch).not.toContain("updateStatus");
    expect(printBranch).not.toContain("sendToCashier");
    expect(printBranch).not.toContain("staffSettle");
    expect(printBranch).not.toContain("staffCancel");
    expect(printBranch).not.toContain("cancelSessionless");
  });

  it("lifecycle executeAction refuses to map Print onto order.updateStatus", () => {
    const actions = read(
      "client/src/lib/operational-workspace/useOrderStatusActions.ts"
    );
    expect(actions).toContain('if (actionId === "print-order"');
    expect(actions).not.toMatch(/"print-order":\s*\{\s*targetStatus/);
    expect(actions).toContain('trpc.order.updateStatus.useMutation');
  });

  it("existing print command only builds a ticket payload and requests print", () => {
    const command = read(
      "server/print-workspace/commands/PrintWorkspaceCommandService.ts"
    );
    const printOrderFn = command.slice(
      command.indexOf("async printOrder"),
      command.indexOf("async reprint")
    );
    expect(printOrderFn).toContain("printingService.buildPayloadForOrder");
    expect(printOrderFn).toContain("printingService.requestPrint");
    expect(printOrderFn).not.toContain("updateStatus");
    expect(printOrderFn).not.toContain("advanceStatus");
    expect(printOrderFn).not.toContain("settle");
    expect(printOrderFn).not.toContain("invoice");
    expect(printOrderFn).not.toContain("collectionFact");
    expect(printOrderFn).not.toContain("markPaid");
    expect(printOrderFn).not.toContain("drawer");
  });

  it("does not add a second receipt or financial print engine", () => {
    const panel = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    expect(panel).not.toContain("window.print()");
    expect(panel).not.toContain("SettlementReceipt");
    expect(panel).not.toContain("CashierPaidReceipt");
    expect(panel).not.toContain("printInvoice");
  });
});
