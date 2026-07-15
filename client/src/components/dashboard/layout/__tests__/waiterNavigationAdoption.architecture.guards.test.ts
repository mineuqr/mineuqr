import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("WAITER-NAVIGATION-ADOPTION-1 architecture guards", () => {
  it("dashboard sidebar exposes Waiter Ordering to existing /waiter routes", () => {
    const sidebar = read(
      "client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx"
    );
    expect(sidebar).toContain("waiter-ordering");
    expect(sidebar).toContain("`/waiter/${slug}/tables`");
    expect(sidebar).toContain('setLocation("/waiter")');
    expect(sidebar).toContain("openWaiterOrdering");
    // Channel entry must not become an in-dashboard RestaurantTab.
    expect(sidebar).not.toContain('onRestaurantTabChange!("waiter');
  });

  it("does not register a second waiter route in App.tsx", () => {
    const app = read("client/src/App.tsx");
    const waiterRouteCount = (app.match(/path="\/waiter/g) || []).length;
    expect(waiterRouteCount).toBe(7);
  });

  it("does not modify WaiterShell for navigation adoption", () => {
    const shell = read("client/src/pages/waiter/WaiterShell.tsx");
    expect(shell).toContain("WAITER-ORDERING-FOUNDATION-1");
    expect(shell).not.toContain("WAITER-NAVIGATION-ADOPTION-1");
  });

  it("passes restaurant slug from Dashboard into operations shell", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const opsShell = read(
      "client/src/components/dashboard/layout/RestaurantOperationsShell.tsx"
    );
    expect(dashboard).toContain("restaurantSlug={sidebarRestaurant?.slug ?? null}");
    expect(opsShell).toContain("restaurantSlug={restaurantSlug}");
  });
});
