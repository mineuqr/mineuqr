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
