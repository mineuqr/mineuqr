/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OPERATIONAL_ORDER_HIERARCHY,
  resolveOperationalOrderDensity,
} from "@/design-system/operational-order-card";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("OPERATIONAL-ORDER-CARD-PLATFORM-1", () => {
  it("exports canonical platform primitives", () => {
    const barrel = read("client/src/design-system/operational-order-card/index.ts");
    for (const name of [
      "OperationalOrderCard",
      "OperationalOrderHeader",
      "OperationalOrderStatus",
      "OperationalOrderTimeline",
      "OperationalOrderItems",
      "OperationalOrderItem",
      "OperationalOrderQuantity",
      "OperationalOrderModifiers",
      "OperationalOrderNotes",
      "OperationalOrderPriority",
      "OperationalOrderDelay",
      "OperationalOrderFooter",
      "OperationalOrderActions",
      "mapWaiterOrderPresentation",
      "mapDashboardOrderPresentation",
    ]) {
      expect(barrel).toContain(name);
    }
    expect(OPERATIONAL_ORDER_HIERARCHY).toEqual([
      "header",
      "status",
      "items",
      "notes",
      "financial",
      "actions",
    ]);
  });

  it("defines compact / comfortable / kitchen / large-display densities with scroll", () => {
    for (const density of ["compact", "comfortable", "kitchen", "large-display"] as const) {
      const tokens = resolveOperationalOrderDensity(density);
      expect(tokens.itemsScrollClass).toContain("overflow-y-auto");
      expect(tokens.maxVisibleLineItems).toBe(Number.POSITIVE_INFINITY);
    }
  });

  it("status rendering uses SemanticBadge only", () => {
    const status = read(
      "client/src/design-system/operational-order-card/components/OperationalOrderStatus.tsx"
    );
    expect(status).toContain("SemanticBadge");
    expect(status).toContain("mapOrderStatusToBadgeTone");
    expect(status).not.toContain("Badge variant");
  });

  it("Orders / Kitchen facades adopt OperationalOrderCard", () => {
    expect(read("client/src/components/operational-workspace/OperationalCard.tsx")).toContain(
      "OperationalOrderCard"
    );
    expect(read("client/src/components/kitchen/KitchenExecutionCard.tsx")).toContain(
      "OperationalOrderCard"
    );
  });

  it("Waiter / Dashboard / Print / session list adopt platform", () => {
    expect(read("client/src/pages/waiter/WaiterTableWorkspaceStage.tsx")).toContain(
      "OperationalOrderCard"
    );
    expect(read("client/src/pages/Dashboard.tsx")).toContain("OperationalOrderCard");
    expect(read("client/src/components/print-workspace/PrintWorkspacePanel.tsx")).toContain(
      "OperationalOrderStatus"
    );
    expect(read("client/src/components/dashboard/DiningSessionOrdersList.tsx")).toContain(
      "OperationalOrderStatus"
    );
  });

  it("program docs exist", () => {
    const base = "docs/engineering/programs/OPERATIONAL-ORDER-CARD-PLATFORM-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
