import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-FLEET-SCALE-1 client architecture guards", () => {
  it("workspace uses fleet query — not management.list", () => {
    const panel = read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx");
    expect(panel).toContain("useFleetQuery");
    expect(panel).toContain("operationalDevice.fleet");
    expect(panel).not.toContain("management.list.useQuery");
    expect(panel).not.toContain("getHealthSummary.useQuery");
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

  it("client FleetQueryEngine delegates to server", () => {
    const engine = read("client/src/lib/screen-fleet/FleetQueryEngine.ts");
    expect(engine).toContain("class FleetQueryEngine");
    expect(engine).not.toContain(".filter(");
  });
});
