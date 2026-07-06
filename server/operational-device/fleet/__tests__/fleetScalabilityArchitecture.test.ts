import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-FLEET-SCALE-1 architecture guards", () => {
  it("fleet read router uses verifiedProcedure and query engine", () => {
    const router = read("server/operational-device/fleet/routers/fleetReadRouter.ts");
    expect(router).toContain("verifiedProcedure");
    expect(router).toContain("fleetComposition.queryEngine");
    expect(router).toContain("queryScreens");
    expect(router).toContain("getKpis");
  });

  it("FleetQueryEngine is single query authority", () => {
    const engine = read("server/operational-device/fleet/services/FleetQueryEngine.ts");
    expect(engine).toContain("class FleetQueryEngine");
    expect(engine).toContain("queryScreens");
    expect(engine).toContain("paginate");
    expect(engine).toContain("cacheHits");
  });

  it("fleet read model contract defines canonical state", () => {
    const contract = read("server/operational-device/fleet/domain/fleetReadModelContracts.ts");
    expect(contract).toContain("OperationalScreenFleetReadModel");
    expect(contract).toContain("canonicalState");
    expect(contract).toContain("FleetCursor");
  });

  it("operational device router exposes fleet read namespace", () => {
    const root = read("server/operational-device/operationalDeviceRouter.ts");
    expect(root).toContain("fleet: fleetReadRouter");
  });

  it("management list preserved for backward compatibility", () => {
    const management = read("server/operational-device/routers/operationalDeviceManagementRouter.ts");
    expect(management).toContain("list:");
    expect(management).toContain("getHealthSummary:");
  });
});
