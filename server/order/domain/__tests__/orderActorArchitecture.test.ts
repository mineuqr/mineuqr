import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-ACTOR-MODEL-1 architecture guards", () => {
  it("defines a single canonical OrderActor value object", () => {
    const actor = read("server/order/domain/value-objects/OrderActor.ts");
    expect(actor).toContain('kind: "user"');
    expect(actor).toContain('kind: "device"');
    expect(actor).toContain('kind: "system"');
    expect(actor).not.toContain("DashboardActor");
    expect(actor).not.toContain("KitchenActor");
    expect(actor).not.toContain("ScreenActor");
  });

  it("resolves actors in application layer only", () => {
    const resolver = read("server/order/application/resolveOrderActor.ts");
    const kitchenPanel = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    expect(resolver).toContain("resolveOrderActorFromUser");
    expect(resolver).toContain("resolveOrderActorFromDeviceSession");
    expect(kitchenPanel).not.toContain("resolveOrderActorFromUser");
    expect(kitchenPanel).not.toContain("OrderActor");
  });

  it("dashboard and device execution pass resolved OrderActor to domain service", () => {
    const routers = read("server/routers.ts");
    const deviceExecution = read("server/operational-device/services/DeviceOrderExecutionService.ts");
    expect(routers).toContain("resolveOrderActorFromUser");
    expect(deviceExecution).toContain("resolveOrderActorFromDeviceSession");
    expect(deviceExecution).not.toContain('role: "staff"');
  });
});
