/**
 * REALTIME-PLATFORM-FOUNDATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("REALTIME-PLATFORM-FOUNDATION-1", () => {
  it("exposes shared protocol, channels, capabilities, hints", () => {
    const index = read("shared/realtime-platform/index.ts");
    expect(index).toContain("protocol");
    expect(index).toContain("channels");
    expect(index).toContain("capabilities");
    expect(index).toContain("hints");
  });

  it("mounts SSE router and tRPC realtime router", () => {
    const api = read("server/_core/createApiApp.ts");
    expect(api).toContain('"/api/realtime"');
    expect(api).toContain("realtimeHttpRouter");

    const routers = read("server/routers.ts");
    expect(routers).toContain("realtime: realtimePlatformRouter");
  });

  it("keeps connector WebSocket separate from browser SSE", () => {
    const index = read("server/_core/index.ts");
    expect(index).toContain("attachConnectorWebSocketServer");
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    expect(gateway).not.toMatch(/\bWebSocket\b/);
    expect(gateway).toContain("text/event-stream");
  });

  it("client platform encapsulates EventSource; role-gated device channels", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(client).toContain("EventSource");
    expect(client).toContain("RealtimeBroadcastBridge");

    const kitchenHook = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeRealtime.ts"
    );
    expect(kitchenHook).toContain('role === "kitchen_display"');

    const expoHook = read(
      "client/src/lib/operational-screen/kitchen/useExpoRuntimeRealtime.ts"
    );
    expect(expoHook).toContain('role === "expo_display"');
    expect(expoHook).toContain('channels: ["expo"]');
  });

  it("publisher does not query database", () => {
    const publisher = read(
      "server/realtime-platform/publisher/RealtimeHintPublisher.ts"
    );
    expect(publisher).not.toContain('from "../../db"');
    expect(publisher).not.toContain("getDb");
    expect(publisher).toContain("assertHintIsMetadataOnly");
  });

  it("surface capability registry tracks migration per surface", () => {
    const caps = read("shared/realtime-platform/capabilities.ts");
    expect(caps).toContain('surfaceId: "orders-workspace"');
    expect(caps).toContain('surfaceId: "kitchen-screen"');
    expect(caps).toContain('surfaceId: "expo-screen"');
    expect(caps).toContain("migrated: true");
    expect(caps).toMatch(/surfaceId: "customer-tracking"[\s\S]*?migrated: false/);
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/REALTIME-PLATFORM-FOUNDATION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
