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
      panel.indexOf("async function selectOrder")
    );
    expect(reviewFn).toContain('setSalePhase("ticket")');
    expect(reviewFn).toContain("setSalePanelOpen(true)");
  });
});
