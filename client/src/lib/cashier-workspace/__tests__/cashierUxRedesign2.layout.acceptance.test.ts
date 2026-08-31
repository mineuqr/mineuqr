/**
 * CASHIER-UX-REDESIGN-2 — static layout acceptance (structure-level).
 * Complements architecture guards; does not replace live Cashier browser path.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-UX-REDESIGN-2 layout acceptance", () => {
  const panel = read(
    "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
  );
  const styles = read("client/src/lib/cashier-workspace/cashierPosStyles.ts");

  it("catalog is the wide primary workspace beside a fixed-width sale rail on lg+", () => {
    expect(styles).toMatch(
      /lg:grid-cols-\[minmax\(18rem,22rem\)_minmax\(0,1fr\)\]/
    );
    expect(styles).toContain("xl:grid-cols-5");
    expect(styles).toContain("min-h-[13.5rem]");
    expect(styles).toContain("orderRailClosed");
    expect(styles).toContain("cartDock");
    expect(styles).toContain("overflow-x-hidden");
    expect(styles).toContain("touch-manipulation");
    expect(styles).toContain("orderFooter");
    expect(styles).toContain("orderLines");
    expect(styles).toContain("catalogSort");
    expect(styles).toContain("topSearchSort");
    expect(styles).toContain("summaryRow");
    expect(styles).toContain("w-[6.5rem]");
    expect(styles).toContain("stroke-[2.25]");
  });

  it("Incoming is top notification + popover, not a permanent right rail", () => {
    expect(panel).toContain("cashierPos.incomingBar");
    expect(panel).toContain("Popover");
    expect(panel).toContain("setIncomingOpen");
    expect(panel.indexOf("cashierPos.incomingBar")).toBeLessThan(
      panel.indexOf("cashierPos.body")
    );
    expect(panel).not.toMatch(
      /cashierPos\.aside[\s\S]{0,200}incomingOrders/
    );
  });

  it("Search + Sort share the Incoming top control row", () => {
    const incomingStart = panel.indexOf("cashierPos.incomingBar");
    const bodyStart = panel.indexOf("cashierPos.body");
    const topRegion = panel.slice(incomingStart, bodyStart);
    expect(topRegion).toContain("cashierPos.topSearchSort");
    expect(topRegion).toContain("cashierPos.catalogSearch");
    expect(topRegion).toContain("cashierPos.catalogSort");
    expect(panel.indexOf("cashierPos.categoryBar")).toBeGreaterThan(bodyStart);
    expect(panel).not.toContain("cashierPos.catalogToolbar");
  });

  it("Current Sale keeps compact summary + independent item scroll", () => {
    expect(styles).toContain("summaryRow");
    expect(styles).toContain("totalRow");
    expect(styles).toContain("text-[13px]");
    expect(styles).toContain("space-y-1");
    expect(panel).toContain("cashierPos.orderLines");
    expect(panel).toContain("cashierPos.orderFooter");
    expect(panel.indexOf("cashierPos.orderLines")).toBeLessThan(
      panel.indexOf("cashierPos.orderFooter")
    );
    expect(panel).toContain("cashierPos.summaryRow");
    expect(panel).toContain("cashierPos.totalRow");
  });

  it("Current Sale item rows stay single-line: name, price, qty, delete", () => {
    expect(styles).toMatch(
      /ticketLine:\s*"flex min-w-0 items-center/
    );
    expect(styles).toContain("ticketLineName");
    expect(styles).toContain("flex-1 truncate text-[15px] font-semibold");
    expect(styles).toContain("CASHIER_TEXT_PRIMARY");
    expect(styles).toContain('CASHIER_TEXT_PRIMARY = "#111827"');
    expect(styles).toMatch(/summaryRow:[\s\S]*?text-\[#111827\]/);
    expect(styles).not.toContain("ticketLineControls: \"col-span-2");
    expect(panel).toContain("cashierPos.ticketLineDelete");
    expect(panel).toContain("changeQty(menuItemId, -line.quantity)");
  });

  it("unifies primary operational text to CASHIER_TEXT_PRIMARY", () => {
    expect(styles).toContain('CASHIER_TEXT_PRIMARY = "#111827"');
    expect(styles).toContain('CASHIER_TEXT_MUTED = "#374151"');
    expect(styles).toMatch(/summaryRow:[\s\S]*?text-\[#111827\]/);
    expect(styles).toMatch(/ticketLineName:[\s\S]*?text-\[#111827\]/);
    expect(styles).toMatch(/ticketLinePrice:[\s\S]*?text-\[#111827\]/);
    expect(styles).toMatch(/orderEmptyTitle:[\s\S]*?text-\[#111827\]/);
    expect(styles).toMatch(/productPrice:[\s\S]*?text-\[#4f46e5\]/);
    expect(styles).toMatch(/ticketLineDelete:[\s\S]*?text-\[#b91c1c\]/);
    expect(panel).not.toContain("text-[#6b7280]");
  });

  it("Product Card click-to-add is primary; + is secondary size-10", () => {
    const card = read(
      "client/src/components/cashier-workspace/CashierProductCard.tsx"
    );
    expect(card).toContain('role="button"');
    expect(card).toContain("onClick={handleAdd}");
    expect(card).toContain("stopPropagation");
    expect(card).toContain("onToggleFavorite");
    expect(styles).toMatch(/productAdd:[\s\S]*?size-10/);
  });

  it("adapts Current Sale to a sheet/dock below lg and keeps Payment modal-only", () => {
    expect(panel).toContain("salePanelOpen");
    expect(panel).toContain("cashierPos.cartDock");
    expect(panel).toContain("cashierPos.orderRailClosed");
    expect(panel).toContain("cashierPos.saleBackdrop");
    expect(styles).toContain("max-lg:fixed");
    expect(styles).toContain("lg:hidden");
    expect(panel).toContain("paymentOpen ?");
    expect(styles).toContain("fixed inset-0");
  });

  it("category tiles resolve icons and Incoming select does not auto-pay", () => {
    expect(panel).toContain("resolveCashierCategoryIcon");
    expect(panel).toContain("cashierPos.categoryIcon");
    const reviewFn = panel.slice(
      panel.indexOf("function reviewInvoiceIntent"),
      panel.indexOf("async function collectIncomingInvoice")
    );
    expect(reviewFn).toContain('setSalePhase("ticket")');
    expect(reviewFn).toContain("setSalePanelOpen(true)");
  });

  it("Collect Invoice routes directly to Payment without editable intermediate", () => {
    expect(panel).toContain("async function collectIncomingInvoice");
    const collectFn = panel.slice(
      panel.indexOf("async function collectIncomingInvoice"),
      panel.indexOf("async function selectOrder")
    );
    expect(collectFn).toContain("resumePaymentSheet");
    expect(collectFn).toContain("getInvoiceIntent.fetch");
    expect(panel).toContain("void collectIncomingInvoice(intent.orderId)");
  });
});
