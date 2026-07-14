import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("OPERATIONAL-SESSION-PLATFORM-1 architecture guards", () => {
  it("shared contracts own Session Anchor vocabulary (not channels)", () => {
    const contract = read(
      "shared/operational-session/operationalSessionContract.ts"
    );
    expect(contract).toContain("OPERATIONAL_SESSION_ANCHOR_TYPES");
    expect(contract).toContain("SessionAnchor");
    expect(contract).toContain("OperationalSession");
    expect(contract).toContain("createTableSessionAnchor");
    expect(contract).toContain("Option B");
  });

  it("order.create resolves via Operational Session Platform", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("resolveOperationalSession");
    expect(router).toContain("createTableSessionAnchor");
    expect(router).not.toMatch(
      /order\.create[\s\S]{0,800}resolveSessionForOrderCreate/
    );
  });

  it("table adapter delegates to Dining Session specialization", () => {
    const adapter = read("server/operational-session/tableSessionAdapter.ts");
    expect(adapter).toContain("resolveSessionForOrderCreate");
    expect(adapter).toContain("mapDiningSessionToOperational");
  });

  it("routes non-table anchors to ephemeral adapter (no channel forks)", () => {
    const resolve = read(
      "server/operational-session/resolveOperationalSession.ts"
    );
    expect(resolve).toContain('case "table"');
    expect(resolve).toContain("resolveEphemeralOperationalSession");
    expect(resolve).toContain('case "station"');
    expect(resolve).not.toContain("if (channel");
    expect(resolve).not.toContain("ORDERING_CHANNEL_KIOSK");
  });

  it("does not rename DiningSession persistence away", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('mysqlTable("dining_sessions"');
    expect(schema).toContain("tableId");
  });
});
