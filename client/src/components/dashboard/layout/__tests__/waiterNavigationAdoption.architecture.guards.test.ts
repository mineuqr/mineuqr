import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("OPERATIONAL-SCREEN-CATALOG-POLICY-1 — dashboard waiter entry removed", () => {
  it("dashboard sidebar no longer exposes standalone Waiter Ordering entry", () => {
    const sidebar = read(
      "client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx"
    );
    expect(sidebar).not.toContain("waiter-ordering");
    expect(sidebar).not.toContain("/waiter/");
    expect(sidebar).not.toContain("openWaiterOrdering");
    expect(sidebar).toContain('id: "screens"');
  });

  it("App waiter routes remain registered for channel / screen host reuse", () => {
    const app = read("client/src/App.tsx");
    const waiterRouteCount = (app.match(/path="\/waiter/g) || []).length;
    expect(waiterRouteCount).toBe(7);
  });
});
