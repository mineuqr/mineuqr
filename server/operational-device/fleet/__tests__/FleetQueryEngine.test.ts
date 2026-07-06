import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryOperationalDeviceStore } from "../../infrastructure/InMemoryOperationalDeviceStore";
import { InMemoryFleetReadStore } from "../infrastructure/InMemoryFleetReadStore";
import { FleetQueryEngine } from "../services/FleetQueryEngine";
import { projectFleetCanonicalState } from "../domain/fleetCanonicalState";

describe("FleetQueryEngine", () => {
  let engine: FleetQueryEngine;
  let store: InMemoryOperationalDeviceStore;

  beforeEach(async () => {
    store = new InMemoryOperationalDeviceStore();
    engine = new FleetQueryEngine(new InMemoryFleetReadStore(store));

    const now = new Date().toISOString();
    for (let i = 0; i < 5; i++) {
      await store.createDevice({
        deviceId: `device-${i}`,
        restaurantId: 1,
        role: i < 2 ? "kitchen_display" : "pickup_display",
        displayName: `Screen ${i}`,
        branchId: i % 2 === 0 ? 10 : null,
        now,
      });
      await store.saveToken({
        tokenId: `token-${i}`,
        deviceId: `device-${i}`,
        secretHash: "hash",
        status: "active",
        issuedAt: now,
        expiresAt: null,
        revokedAt: null,
        lastUsedAt: null,
        createdAt: now,
      });
    }

    await store.touchDeviceHeartbeat("device-0", {
      lastSeenAt: now,
      reportedVersion: "1.0.0",
    });
  });

  it("returns paginated fleet read models", async () => {
    const result = await engine.queryScreens({ restaurantId: 1, limit: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.cursor.pageSize).toBe(2);
    expect(result.cursor.hasMore).toBe(true);
    expect(result.items[0]?.screenId).toBeDefined();
    expect(result.items[0]?.canonicalState).toBeDefined();
  });

  it("cursor pagination fetches next page", async () => {
    const first = await engine.queryScreens({ restaurantId: 1, limit: 2, sortBy: "displayName", sortOrder: "asc" });
    const second = await engine.queryScreens({
      restaurantId: 1,
      limit: 2,
      sortBy: "displayName",
      sortOrder: "asc",
      cursor: first.cursor.nextCursor,
    });
    expect(second.items).toHaveLength(2);
    expect(first.items[0]?.screenId).not.toBe(second.items[0]?.screenId);
  });

  it("server-side search filters by display name", async () => {
    const result = await engine.queryScreens({ restaurantId: 1, search: "Screen 0" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.displayName).toBe("Screen 0");
  });

  it("server-side role filter", async () => {
    const result = await engine.queryScreens({ restaurantId: 1, role: "kitchen_display" });
    expect(result.items.every((i) => i.role === "kitchen_display")).toBe(true);
    expect(result.items.length).toBe(2);
  });

  it("canonical operational state filter for blocked roles", async () => {
    const result = await engine.queryScreens({ restaurantId: 1, operationalState: "blocked" });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.canonicalState.operationalState === "blocked")).toBe(true);
  });

  it("groups by branch", async () => {
    const result = await engine.queryScreens({ restaurantId: 1, groupBy: "branch", limit: 50 });
    expect(result.groups).not.toBeNull();
    expect(result.groups!.length).toBeGreaterThan(0);
  });

  it("cache hit on repeated identical query", async () => {
    const q = { restaurantId: 1, limit: 10 };
    await engine.queryScreens(q);
    const second = await engine.queryScreens(q);
    expect(second.observability.cacheHit).toBe(true);
    expect(engine.getMetrics().cacheHits).toBeGreaterThan(0);
  });

  it("getKpis returns aggregate counts", async () => {
    const kpis = await engine.getKpis(1);
    expect(kpis.total).toBe(5);
    expect(kpis.online).toBeGreaterThanOrEqual(1);
  });

  it("scales linearly — 1000 screens single pass", async () => {
    const bigStore = new InMemoryOperationalDeviceStore();
    const bigEngine = new FleetQueryEngine(new InMemoryFleetReadStore(bigStore));
    const now = new Date().toISOString();

    for (let i = 0; i < 1000; i++) {
      await bigStore.createDevice({
        deviceId: `scale-${i}`,
        restaurantId: 99,
        role: "kitchen_display",
        displayName: `Scale Screen ${i}`,
        now,
      });
    }

    const started = performance.now();
    const result = await bigEngine.queryScreens({
      restaurantId: 99,
      search: "Scale Screen 9",
      limit: 50,
    });
    const duration = performance.now() - started;

    expect(result.items.length).toBeLessThanOrEqual(50);
    expect(duration).toBeLessThan(2000);
  });
});

describe("projectFleetCanonicalState", () => {
  it("blocked role maps to blocked operational state", () => {
    const state = projectFleetCanonicalState({
      status: "active",
      role: "pickup_display",
      presence: "online",
      hasActiveToken: true,
    });
    expect(state.operationalState).toBe("blocked");
    expect(state.businessReadiness).toBe("role_unavailable");
  });

  it("disabled device maps to maintenance", () => {
    const state = projectFleetCanonicalState({
      status: "disabled",
      role: "kitchen_display",
      presence: "offline",
      hasActiveToken: true,
    });
    expect(state.operationalState).toBe("maintenance");
    expect(state.maintenanceState).toBe("maintenance");
  });
});
