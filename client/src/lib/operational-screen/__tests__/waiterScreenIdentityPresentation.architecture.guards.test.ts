import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("WAITER-SCREEN-IDENTITY-PRESENTATION-1 architecture guards", () => {
  it("WaiterRolePresentation consumes Runtime Public identity APIs", () => {
    const src = read(
      "client/src/components/operational-screen/roles/WaiterRolePresentation.tsx"
    );
    expect(src).toContain("useRuntimeIdentity");
    expect(src).toContain("useRuntimeBusiness");
    expect(src).toContain("useRuntimeRole");
    expect(src).toContain("identity.displayIdentity");
    expect(src).toContain("screenName:");
    expect(src).toContain("roleLabel:");
    expect(src).not.toContain("createContext");
  });

  it("does not reconstruct screen identity in WaiterShell", () => {
    const shell = read("client/src/pages/waiter/WaiterShell.tsx");
    expect(shell).toContain("screenName");
    expect(shell).toContain("activation.screenName");
    expect(shell).not.toContain("deviceId");
    expect(shell).not.toContain("getDevice");
  });

  it("tables header presents business name and screen name", () => {
    const tables = read("client/src/pages/waiter/WaiterTablesStage.tsx");
    const header = read("client/src/pages/waiter/WaiterScreenIdentityHeader.tsx");
    expect(tables).toContain("WaiterScreenIdentityHeader");
    expect(tables).toContain("screenName");
    expect(header).toContain("restaurantName");
    expect(header).toContain("screenName");
    expect(header).toContain("roleLabel");
  });
});
