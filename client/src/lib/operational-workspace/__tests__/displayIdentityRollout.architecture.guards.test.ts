import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("DISPLAY-IDENTITY-ROLLOUT-1 operational UI guards", () => {
  it("routes operational display through orderDisplayIdentity helper", () => {
    const ordersWorkspace = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    const kitchenViewModels = read("client/src/lib/kitchen/viewModels.ts");

    expect(ordersWorkspace).toContain("formatOperationalOrderHeading");
    expect(ordersWorkspace).toContain("orderDisplayIdentity");
    expect(ordersWorkspace).not.toMatch(/#\$\{selected\.orderNumber\}/);
    expect(ordersWorkspace).not.toMatch(/#\$\{order\.orderNumber\}/);

    expect(kitchenViewModels).toContain("operationalDisplayReference");
    expect(kitchenViewModels).not.toContain("ticket.displayReference || ticket.orderNumber");
  });

  it("renders displayReference on operational card surfaces", () => {
    const card = read("client/src/components/operational-workspace/OperationalCard.tsx");
    const kitchenCard = read("client/src/components/kitchen/KitchenExecutionCard.tsx");

    expect(card).toContain("displayReference");
    expect(card).not.toContain("orderNumber:");
    expect(kitchenCard).toContain("ticket.displayReference");
  });

  it("delegates client resolution to OrderDisplayIdentityResolver", () => {
    const helper = read("client/src/lib/operational-workspace/orderDisplayIdentity.ts");
    expect(helper).toContain("resolveOrderDisplayIdentity");
    expect(helper).toContain("operationalDisplayReference");
  });
});

describe("DISPLAY-IDENTITY-ROLLOUT-2 operational read surfaces", () => {
  it("exposes display identity on print workspace read DTOs", () => {
    const contracts = read("server/print-workspace/read/contracts/printWorkspaceQueryContracts.ts");
    const mapper = read("server/print-workspace/read/presentation/mapPrintWorkspaceOrderDto.ts");
    expect(contracts).toContain("displayReference");
    expect(mapper).toContain("mapOrderDisplayIdentityFields");
  });

  it("exposes display identity on dining session owner workspace", () => {
    const workspace = read("server/diningSession/sessionOwnerWorkspace.ts");
    expect(workspace).toContain("displayReference");
    expect(workspace).toContain("mapOrderDisplayIdentityFields");
  });

  it("resolves display identity for dashboard order.list", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("mapOrderDisplayIdentityFields");
  });

  it("renders displayReference on migrated operational surfaces", () => {
    const printPanel = read("client/src/components/print-workspace/PrintWorkspacePanel.tsx");
    const printMonitor = read("client/src/components/operational-screen/PrintMonitorScreenPanel.tsx");
    const sessionOrders = read("client/src/components/dashboard/DiningSessionOrdersList.tsx");
    const dashboard = read("client/src/pages/Dashboard.tsx");

    expect(printPanel).toContain("card.displayReference");
    expect(printPanel).toContain("operationalDisplayReference");
    expect(printMonitor).toContain("formatOperationalOrderHeading");
    expect(sessionOrders).toContain("formatOperationalOrderHeading");
    expect(dashboard).toContain("formatOperationalOrderHeading");
    expect(dashboard).not.toMatch(/#\$\{order\.orderNumber\}/);
  });

  it("uses shared mapOrderDisplayIdentityFields on server read paths", () => {
    const shared = read("server/order/read/presentation/mapOrderDisplayIdentity.ts");
    expect(shared).toContain("resolveOrderDisplayIdentity");
    expect(shared).not.toContain("formatDisplayReference");
  });
});
