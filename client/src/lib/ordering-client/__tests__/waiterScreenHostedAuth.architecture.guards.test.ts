import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildWaiterTableCheckoutIdentity } from "../waiter/waiterTableIdentity";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1 architecture guards", () => {
  it("hosted WaiterShell disables dashboard login redirect", () => {
    const shell = read("client/src/pages/waiter/WaiterShell.tsx");
    expect(shell).toContain("redirectOnUnauthenticated: !hosted");
    expect(shell).toContain('authMode={hosted ? "device" : "staff"}');
    expect(shell).toContain('placeAuth={hosted ? "device" : "staff"}');
  });

  it("dashboard WaiterShell still uses useAuth", () => {
    const shell = read("client/src/pages/waiter/WaiterShell.tsx");
    expect(shell).toContain("useAuth");
    expect(shell).toContain("LOGIN_PATH");
  });

  it("device runtime exposes waiter floor + place endpoints", () => {
    const runtime = read(
      "server/operational-device/routers/operationalDeviceRuntimeRouter.ts"
    );
    expect(runtime).toContain("listWaiterFloorTables");
    expect(runtime).toContain("attachWaiterTable");
    expect(runtime).toContain("getWaiterTableWorkspace");
    expect(runtime).toContain("placeWaiterOrder");
    expect(runtime).toContain("deviceProcedure");
  });

  it("device waiter place forces WAITER scope via Session/Ordering platforms", () => {
    const service = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    expect(service).toContain("resolveOperationalSession");
    expect(service).toContain("identityPlaceOrderService");
    expect(service).toContain('identityScope: "WAITER"');
    expect(service).toContain("rolePermitsWaiterOrdering");
  });

  it("checkout identity supports device placeAuth", () => {
    const device = buildWaiterTableCheckoutIdentity({
      tableId: 1,
      tableNumber: 2,
      placeAuth: "device",
    });
    expect(device.placeAuth).toBe("device");
    const staff = buildWaiterTableCheckoutIdentity({
      tableId: 1,
      tableNumber: 2,
    });
    expect(staff.placeAuth).toBe("staff");
  });

  it("WaiterRolePresentation passes activation restaurant context", () => {
    const presentation = read(
      "client/src/components/operational-screen/roles/WaiterRolePresentation.tsx"
    );
    expect(presentation).toContain("restaurantName");
    expect(presentation).toContain("screenName");
    expect(presentation).toContain("WaiterShell");
    expect(presentation).toContain("useRuntimeBusiness");
    expect(presentation).toContain("useRuntimeIdentity");
    expect(presentation).not.toContain("context.business");
  });
});
