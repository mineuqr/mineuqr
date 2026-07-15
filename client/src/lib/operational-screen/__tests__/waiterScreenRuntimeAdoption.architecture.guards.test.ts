import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("WAITER-SCREEN-RUNTIME-ADOPTION-1 architecture guards", () => {
  const presentation = () =>
    read("client/src/components/operational-screen/roles/WaiterRolePresentation.tsx");

  it("consumes business via Public Runtime API useRuntimeBusiness", () => {
    const src = presentation();
    expect(src).toContain("useRuntimeBusiness");
    expect(src).toContain("business.businessName");
    expect(src).not.toContain("context.business");
  });

  it("keeps identity binding aligned with other role presentations", () => {
    const src = presentation();
    expect(src).toContain("useScreenRuntime");
    expect(src).toContain("useRuntimeIdentity");
    expect(src).toContain("context.identity.restaurantSlug");
    expect(src).toContain("context.identity.restaurantId");
    expect(src).toContain("WaiterShell");
  });

  it("does not introduce waiter-specific runtime contracts", () => {
    const src = presentation();
    expect(src).not.toContain("createContext");
    expect(src).not.toContain("BusinessContext");
    expect(src).not.toMatch(/createRuntime|new\s+Provider/);
  });
});
