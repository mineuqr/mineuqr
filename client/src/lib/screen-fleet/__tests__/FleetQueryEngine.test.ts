import { describe, expect, it } from "vitest";
import { FleetQueryEngine } from "../FleetQueryEngine";
import type { FleetScreenReadModel } from "./fleetReadModel";

function mockScreen(id: string): FleetScreenReadModel {
  return {
    screenId: id,
    displayName: `Screen ${id}`,
    role: "kitchen_display",
    branchId: null,
    zoneId: null,
    canonicalState: {
      operationalState: "operational",
      connectivityState: "connected",
      businessReadiness: "ready",
      maintenanceState: "normal",
    },
    businessReadiness: "ready",
    healthSummary: {
      presence: "online",
      operational: true,
      hasActiveToken: true,
      warningCount: 0,
    },
    lastHeartbeat: null,
    reportedVersion: null,
    configurationVersion: "v1",
    tenantId: 1,
    updatedAt: "2026-01-01",
    createdAt: "2026-01-01",
  };
}

describe("FleetQueryEngine (client)", () => {
  it("delegates query to server fetch — no client filtering", async () => {
    const fetchCalls: unknown[] = [];
    const engine = new FleetQueryEngine(async (input) => {
      fetchCalls.push(input);
      return {
        items: [mockScreen("a")],
        cursor: { nextCursor: "cursor-1", previousCursor: null, pageSize: 50, hasMore: true },
        observability: { queryDurationMs: 1, cacheHit: false, resultCount: 1, cursorCount: 1 },
      };
    });

    const items = await engine.query({ restaurantId: 1, search: "kitchen" });
    expect(items).toHaveLength(1);
    expect(fetchCalls).toHaveLength(1);
    expect((fetchCalls[0] as { search?: string }).search).toBe("kitchen");
  });

  it("loadMore uses cursor from server", async () => {
    let call = 0;
    const engine = new FleetQueryEngine(async (input) => {
      call += 1;
      if (!input.cursor) {
        return {
          items: [mockScreen("a")],
          cursor: { nextCursor: "next", previousCursor: null, pageSize: 50, hasMore: true },
          observability: { queryDurationMs: 1, cacheHit: false, resultCount: 1, cursorCount: 1 },
        };
      }
      return {
        items: [mockScreen("b")],
        cursor: { nextCursor: null, previousCursor: "next", pageSize: 50, hasMore: false },
        observability: { queryDurationMs: 1, cacheHit: false, resultCount: 1, cursorCount: 0 },
      };
    });

    await engine.query({ restaurantId: 1 });
    const merged = await engine.loadMore();
    expect(merged).toHaveLength(2);
    expect(call).toBe(2);
    expect(engine.hasMore()).toBe(false);
  });
});
