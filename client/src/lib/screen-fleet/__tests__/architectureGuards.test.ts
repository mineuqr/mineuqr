import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-FLEET-SCALE-1 client architecture guards", () => {
  it("workspace uses fleet query — not management.list as primary", () => {
    const panel = read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx");
    const configs = read("client/src/lib/screen-management/useFleetScreenConfigs.ts");
    expect(panel).toContain("useFleetQuery");
    expect(panel).not.toContain("management.list.useQuery");
    expect(panel).not.toContain("getHealthSummary.useQuery");
    expect(configs).toContain("management.list.useQuery");
  });

  it("fleet cards consume read model only", () => {
    const card = read("client/src/components/screen-management/FleetScreenCard.tsx");
    expect(card).toContain("FleetScreenReadModel");
    expect(card).toContain("canonicalState");
    expect(card).not.toContain("deriveDevicePresence");
    expect(card).not.toContain("summarizeDeviceHealth");
  });

  it("virtualized grid does not render all items unconditionally", () => {
    const grid = read("client/src/components/screen-management/VirtualizedFleetGrid.tsx");
    expect(grid).toContain("visibleItems");
    expect(grid).toContain('data-virtualized="fleet-grid"');
  });

  it("UX-1B — fleet table view uses VirtualizedFleetTable with shared status model", () => {
    const panel = read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx");
    const table = read("client/src/components/screen-management/VirtualizedFleetTable.tsx");
    const row = read("client/src/components/screen-management/FleetScreenTableRow.tsx");
    const presentation = read("client/src/lib/screen-management/operatorFleetPresentation.ts");
    expect(panel).toContain("VirtualizedFleetTable");
    expect(panel).toContain("FleetScreenTableRow");
    expect(table).toContain('data-virtualized="fleet-table"');
    expect(row).toContain("FleetScreenManageMenu");
    expect(presentation).toContain("resolveOperatorFleetStatus");
    expect(presentation).toContain("operatorFleetStatusPillClass");
  });

  it("client FleetQueryEngine delegates to server", () => {
    const engine = read("client/src/lib/screen-fleet/FleetQueryEngine.ts");
    expect(engine).toContain("class FleetQueryEngine");
    expect(engine).not.toContain(".filter(");
  });
});
