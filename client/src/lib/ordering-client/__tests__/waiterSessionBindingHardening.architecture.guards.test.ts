import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("WAITER-SESSION-BINDING-HARDENING-1 architecture guards", () => {
  it("WaiterShell validates binding before browse/cart/checkout", () => {
    const shell = read("client/src/pages/waiter/WaiterShell.tsx");
    expect(shell).toContain("useWaiterSessionBindingGuard");
    expect(shell).toContain("sessionDependentStage");
    expect(shell).toContain("`/waiter/${slug}/tables`");
    expect(shell).not.toContain("recoverDiningSession");
    expect(shell).not.toContain("resolveOperationalSession");
  });

  it("does not change Session Platform ownership or QR recovery", () => {
    const resolve = read("server/operational-session/resolveOperationalSession.ts");
    const recovery = read("client/src/lib/diningSessionRecovery.ts");
    expect(resolve).toContain("resolveTableOperationalSession");
    expect(recovery).toContain("saveDiningSession");
    expect(recovery).not.toContain("waiter");
  });

  it("placeAsWaiter remains server-side session gate", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("placeAsWaiter");
    expect(routers).toContain("sessionToken");
  });
});
