import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("WAITER-TABLE-WORKSPACE-1 architecture guards", () => {
  it("workspace stage consumes waiter/device workspace DTO endpoints only", () => {
    const stage = read("client/src/pages/waiter/WaiterTableWorkspaceStage.tsx");
    expect(stage).toContain("getTableWorkspace");
    expect(stage).toContain("getWaiterTableWorkspace");
    expect(stage).not.toContain("session.getOwnerWorkspace");
    expect(stage).not.toContain("getOrdersBySessionId");
    expect(stage).not.toContain("PlaceOrderService");
    expect(stage).not.toMatch(/reduce\s*\(|\.reduce\(/);
  });

  it("shell opens workspace from table selection before browse", () => {
    const shell = read("client/src/pages/waiter/WaiterShell.tsx");
    expect(shell).toContain("WaiterTableWorkspaceStage");
    expect(shell).toContain("goWorkspaceWithBinding");
    expect(shell).toContain('setHostStage("workspace")');
    expect(shell).toContain("/workspace?");
  });

  it("floor overview exposes order count and session total from floor DTO", () => {
    const tables = read("client/src/pages/waiter/WaiterTablesStage.tsx");
    expect(tables).toContain("totalOrders");
    expect(tables).toContain("sessionTotalAmount");
  });

  it("server workspace assembles from Order Read projections", () => {
    const service = read(
      "server/operational-device/services/WaiterTableWorkspaceService.ts"
    );
    const store = read(
      "server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts"
    );
    expect(service).toContain("listOrdersBySessionId");
    expect(service).toContain("sessionTotalAmount");
    expect(store).toContain("listOrdersBySessionId");
    expect(store).toContain("orderReadOrders");
  });

  it("device and staff routers expose workspace read", () => {
    const runtime = read(
      "server/operational-device/routers/operationalDeviceRuntimeRouter.ts"
    );
    const routers = read("server/routers.ts");
    expect(runtime).toContain("getWaiterTableWorkspace");
    expect(routers).toContain("getTableWorkspace");
  });

  it("does not modify Order Domain place or materializer ownership", () => {
    const service = read(
      "server/operational-device/services/WaiterTableWorkspaceService.ts"
    );
    expect(service).not.toContain("PlaceOrderService");
    expect(service).not.toContain("OrderReadProjectionMaterializer");
    expect(service).not.toContain("resolveOperationalSession");
  });
});
