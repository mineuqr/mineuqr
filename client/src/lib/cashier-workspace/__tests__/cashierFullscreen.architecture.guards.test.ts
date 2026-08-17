/**
 * CASHIER-UX-FULLSCREEN-AND-THEME-1 — presentation / routing guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const FALLBACK = "client/src/components/cashier-workspace/CashierRouteFallback.tsx";
const STYLES = "client/src/lib/cashier-workspace/cashierPosStyles.ts";
const NAV = "client/src/lib/cashier-workspace/cashierWorkspaceNav.ts";
const DASHBOARD = "client/src/pages/Dashboard.tsx";
const SHELL = "client/src/components/dashboard/layout/RestaurantOperationsShell.tsx";
const APP = "client/src/App.tsx";
const INDEX_CSS = "client/src/index.css";
const RESTAURANT_DASH = "client/src/components/dashboard/restaurantDashStyles.ts";
const ORDERS = "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx";
const SETTLEMENTS = "client/src/components/settlement-record/SettlementHistoryPanel.tsx";
const REGISTER = "client/src/components/register-operations/RegisterOperationsPanel.tsx";
const REPORTS = "client/src/components/dashboard/ReportsTab.tsx";

describe("CASHIER-UX-FULLSCREEN-AND-THEME-1 architecture guards", () => {
  it("enters fullscreen Cashier through existing Dashboard routing, not a /pos app", () => {
    const dashboard = read(DASHBOARD);
    const shell = read(SHELL);
    const app = read(APP);
    const nav = read(NAV);
    expect(dashboard).toContain("useDashboardNavigation");
    expect(dashboard).toContain(
      'immersive={activeSection === "restaurant-detail" && restaurantTab === "cashier"}'
    );
    expect(dashboard).toContain("CashierRouteFallback");
    expect(dashboard).toContain("restaurantTab !== \"cashier\"");
    expect(shell).toContain("immersive");
    const immersiveStart = shell.indexOf("if (immersive)");
    const afterImmersive = shell.slice(immersiveStart);
    const immersiveBlock = afterImmersive.slice(
      0,
      afterImmersive.indexOf("RestaurantSidebarProvider")
    );
    expect(immersiveBlock).toContain("return (");
    expect(immersiveBlock).not.toContain("RestaurantDashboardSidebar");
    expect(immersiveBlock).not.toContain("AdminShellBreadcrumbs");
    expect(nav).toContain("buildDashboardPath");
    expect(nav).toContain('section: "cashier"');
    expect(app).not.toMatch(/path=["']\/pos/);
    expect(app).not.toContain("CashierWorkspacePanel");
  });

  it("keeps a Cashier-only light theme and does not restyle other workspaces", () => {
    const panel = read(PANEL);
    const styles = read(STYLES);
    expect(panel).toContain("cashierPos");
    expect(panel).toContain("cashierPos.root");
    expect(panel).not.toContain("restaurantDash");
    expect(styles).toContain("cashier-pos");
    expect(styles).toContain("bg-[#f4f5f7]");
    expect(styles).toContain("bg-white");
    expect(read(INDEX_CSS)).not.toContain("cashier-pos");
    expect(read(RESTAURANT_DASH)).not.toContain("cashierPos");
    expect(read(ORDERS)).not.toContain("cashierPos");
    expect(read(SETTLEMENTS)).not.toContain("cashierPos");
    expect(read(REGISTER)).not.toContain("cashierPos");
    expect(read(REPORTS)).not.toContain("cashierPos");
  });

  it("retains return, optional new-tab, RTL/LTR, and existing POS commands", () => {
    const panel = read(PANEL);
    const fallback = read(FALLBACK);
    expect(panel).toContain("tryOpenCashierNewTab");
    expect(panel).toContain("returnDashboard");
    expect(panel).toContain("syncDashboardUrl");
    expect(panel).toContain('section: "home"');
    expect(panel).toContain('dir={dir}');
    expect(panel).toContain('language === "ar" ? "rtl" : "ltr"');
    expect(fallback).toContain("returnDashboard");
    expect(fallback).toContain('section: "home"');
    expect(panel).toContain("trpc.pos.sale.create");
    expect(panel).toContain("trpc.pos.check.intake");
    expect(panel).toContain("trpc.pos.settlement.initiate");
    expect(panel).toContain("SettlementReceiptDialog");
    expect(panel).not.toContain("pos_revenue");
    expect(panel).not.toMatch(/SUM\s*\(\s*grandTotal/);
    expect(panel).not.toContain("checkLimit");
  });
});
