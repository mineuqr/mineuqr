/**
 * CASHIER-UX-REDESIGN-1 — presentation / progressive-disclosure guards.
 * Financial contracts remain Cash / Network / Mixed / Complimentary.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cashierUiLabel } from "../cashierCopy";
import { SELECTABLE_PAYMENT_METHODS } from "@shared/operational-session";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const STYLES = "client/src/lib/cashier-workspace/cashierPosStyles.ts";
const TINT = "client/src/lib/cashier-workspace/cashierCategoryTint.ts";
const CARD = "client/src/components/cashier-workspace/CashierProductCard.tsx";

describe("CASHIER-UX-REDESIGN-1 architecture", () => {
  it("uses a three-rail workspace: Current Order | Catalog | Contextual", () => {
    const panel = read(PANEL);
    const styles = read(STYLES);
    expect(panel).toContain("CASHIER-UX-REDESIGN-1");
    expect(panel).toContain("cashierPos.orderRail");
    expect(panel).toContain("cashierPos.catalog");
    expect(panel).toContain("cashierPos.aside");
    expect(panel).toContain('contextualMode: "incoming" | "payment" | "paid"');
    expect(styles).toContain("orderRail");
    expect(styles).toContain("lg:grid-cols-[minmax(18rem,26%)_minmax(0,1fr)_minmax(18rem,26%)]");
  });

  it("shows payment methods only in Payment state and keeps Option A tender modes", () => {
    const panel = read(PANEL);
    expect(panel).toContain('contextualMode === "payment"');
    expect(panel).toContain("cashierPos.overlay");
    expect(panel).toContain('tenderMode === "cash"');
    expect(panel).toContain('tenderMode === "network"');
    expect(panel).toContain('tenderMode === "mixed"');
    expect(panel).toContain('tenderMode === "complimentary"');
    expect(panel).not.toContain("mada");
    expect(panel).not.toContain("apple_pay");
    expect(panel).not.toContain("stc_pay");
    expect(SELECTABLE_PAYMENT_METHODS).toEqual(["cash", "card"]);
    expect(cashierUiLabel("tenderCash", "en")).toBe("Cash");
    expect(cashierUiLabel("tenderNetwork", "en")).toBe("Network");
  });

  it("hydrates Incoming QR into Current Order without auto-opening Payment", () => {
    const panel = read(PANEL);
    const reviewFn = panel.slice(
      panel.indexOf("function reviewInvoiceIntent"),
      panel.indexOf("async function selectOrder")
    );
    expect(reviewFn).toContain('phase: "ticket"');
    expect(reviewFn).toContain('setSalePhase("ticket")');
    expect(reviewFn).not.toContain('setSalePhase("payment")');
    expect(panel).toContain("listInvoiceIntents.useQuery");
    expect(panel).toContain("getInvoiceIntent.fetch");
  });

  it("keeps Confirm on settlement.initiate and pastel category tiles + POS cards", () => {
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("settleMutation.mutateAsync");
    expect(panel).toContain("CashierProductCard");
    expect(panel).toContain("resolveCashierCategoryTint");
    expect(read(TINT)).toContain("soft pastel");
    expect(read(CARD)).toContain("cashierPos.productAdd");
    expect(panel).not.toContain("trpc.pos.cashier");
    expect(panel).not.toContain("commitCashierProductionCollectionFact");
  });
});
