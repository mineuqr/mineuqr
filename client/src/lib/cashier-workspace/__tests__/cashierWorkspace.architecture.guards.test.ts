/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1 — architecture boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CASHIER_V1_PERMISSIONS } from "../cashierWorkspacePermissions";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const COPY = "client/src/lib/cashier-workspace/cashierCopy.ts";
const PERMS = "client/src/lib/cashier-workspace/cashierWorkspacePermissions.ts";
const DASHBOARD = "client/src/pages/Dashboard.tsx";
const SIDEBAR = "client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx";
const TYPES = "client/src/components/dashboard/layout/types.ts";
const URL = "client/src/lib/dashboardUrl.ts";
const REGISTER_OPS =
  "client/src/components/register-operations/RegisterOperationsPanel.tsx";

describe("POS-CASHIER-WORKSPACE-IMPLEMENTATION-1 architecture guards", () => {
  it("adds a dedicated Cashier dashboard tab distinct from Register Ops", () => {
    const types = read(TYPES);
    const url = read(URL);
    const sidebar = read(SIDEBAR);
    const dashboard = read(DASHBOARD);
    expect(types).toContain('| "cashier"');
    expect(url).toContain('cashier: "cashier"');
    expect(sidebar).toContain('id: "cashier"');
    expect(sidebar).toContain('id: "register"');
    expect(dashboard).toContain('activeTab === "cashier"');
    expect(dashboard).toContain("CashierWorkspacePanel");
    expect(dashboard).toContain('activeTab === "register"');
    expect(dashboard).toContain("RegisterOperationsPanel");
    expect(dashboard).not.toMatch(
      /activeTab === "register"[\s\S]{0,80}CashierWorkspacePanel/
    );
    expect(read(REGISTER_OPS)).not.toContain("CashierWorkspacePanel");
    expect(read(REGISTER_OPS)).not.toContain("trpc.pos.read");
  });

  it("Cashier consumes POS read façade and existing POS commands only", () => {
    const panel = read(PANEL);
    expect(panel).toContain("trpc.pos.read.catalog.listItems");
    expect(panel).toContain("trpc.pos.read.orders.listActive");
    expect(panel).toContain("trpc.pos.read.orders.getDetail");
    expect(panel).toContain("trpc.pos.read.orders.getTimeline");
    expect(panel).toContain("trpc.pos.read.orderSettlement.listByOrder");
    expect(panel).toContain("trpc.pos.sale.create");
    expect(panel).toContain("trpc.pos.check.intake");
    expect(panel).toContain("trpc.pos.settlement.initiate");
    expect(panel).not.toContain("trpc.order.read");
    expect(panel).not.toContain("trpc.crmp");
    expect(panel).not.toContain("trpc.pos.cashier");
    expect(panel).not.toContain("getDb");
    expect(panel).not.toContain("checkLimit");
    expect(panel).not.toMatch(/SUM\s*\(\s*grandTotal/);
    expect(panel).not.toContain("pos_revenue");
    expect(panel).not.toContain("IdentityPlaceOrder");
    expect(panel).toContain("resolveImageUrl");
    expect(panel).toContain("categoryNameAr");
    expect(panel).toContain("listMonetaryPaymentMethodOptions");
    expect(panel).toContain('section: "register"');
    expect(panel).toContain("syncDashboardUrl");
    expect(panel).toContain("SettlementReceiptDialog");
    expect(panel).toContain('setSalePhase("payment")');
    expect(panel).not.toContain("RegisterOperationsPanel");
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function orchestrateIntake")
    );
    expect(placeSaleFn).not.toContain("invalidateOrderReads");
    expect(placeSaleFn).toContain('setSalePhase("payment")');
  });

  it("does not auto-grant POS_ACCESS on dashboard load", () => {
    const panel = read(PANEL);
    expect(panel).toContain("async function enableCashierAccess");
    expect(panel).toContain("trpc.pos.access.grant");
    expect(panel).not.toMatch(/useEffect\([\s\S]{0,500}grantMutation/);
    expect(panel).not.toMatch(/if\s*\(\s*isOwner\s*\)\s*return\s*true/);
  });

  it("does not hardcode plan cashier seats or Staff Access catalogs", () => {
    const panel = read(PANEL);
    const copy = read(COPY);
    const perms = read(PERMS);
    expect(CASHIER_V1_PERMISSIONS).toEqual([
      "POS_ACCESS",
      "SALE_CREATE",
      "CHECK_INTAKE",
      "SETTLEMENT_INITIATE",
    ]);
    expect(perms).not.toContain("SHIFT_OPEN");
    expect(panel + copy).not.toMatch(/Basic\s*=\s*1/);
    expect(panel + copy).not.toMatch(/Professional\s*=\s*2/);
    expect(panel).not.toContain("Staff Management");
    expect(panel).not.toContain("POS_SEATS");
  });

  it("keeps loading, empty, forbidden, and error states plus RTL dir", () => {
    const panel = read(PANEL);
    expect(panel).toContain("AppLoadingState");
    expect(panel).toContain("AppEmptyState");
    expect(panel).toContain("AppForbiddenState");
    expect(panel).toContain("AppErrorState");
    expect(panel).toContain('dir={dir}');
    expect(panel).toContain('language === "ar" ? "rtl" : "ltr"');
  });
});
