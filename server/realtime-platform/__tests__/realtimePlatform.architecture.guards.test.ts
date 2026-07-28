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

  it("client platform encapsulates EventSource; features not migrated", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(client).toContain("EventSource");
    expect(client).toContain("RealtimeBroadcastBridge");

    // No feature wiring in this program
    const orders = read(
      "client/src/lib/operational-workspace/useOrderStatusActions.ts"
    );
    expect(orders).not.toContain("realtime-platform");
    expect(orders).not.toContain("getRealtimePlatform");

    const kitchen = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    expect(kitchen).not.toContain("getRealtimePlatform");
    expect(kitchen).not.toContain("@/lib/realtime-platform");
  });

  it("publisher does not query database", () => {
    const publisher = read(
      "server/realtime-platform/publisher/RealtimeHintPublisher.ts"
    );
    expect(publisher).not.toContain('from "../../db"');
    expect(publisher).not.toContain("getDb");
    expect(publisher).toContain("assertHintIsMetadataOnly");
  });

  it("surface capability registry marks migrated=false", () => {
    const caps = read("shared/realtime-platform/capabilities.ts");
    expect(caps).toContain("migrated: false");
    expect(caps).not.toMatch(/migrated:\s*true/);
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/REALTIME-PLATFORM-FOUNDATION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
