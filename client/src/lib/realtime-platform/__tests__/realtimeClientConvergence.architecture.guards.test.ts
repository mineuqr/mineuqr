/**
 * REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 — client convergence architecture.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 client convergence", () => {
  it("Kitchen onHint only schedules invalidation — never mutates Order writers", () => {
    const hook = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeRealtime.ts"
    );
    expect(hook).toContain("scheduleKitchenQueueInvalidation");
    expect(hook).toContain("invalidate");
    expect(hook).not.toContain("order.updateStatus");
    expect(hook).not.toContain("setQueryData");
    expect(hook).not.toContain("commitCollectionFact");
  });

  it("catch_up path forces immediate kitchen queue invalidation", () => {
    const hook = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeRealtime.ts"
    );
    const catchUp = hook.slice(hook.indexOf("onCatchUp"));
    expect(catchUp).toContain("scheduleKitchenQueueInvalidation");
    expect(catchUp).toContain("debounceMs: 0");
  });

  it("platform catch_up does not inject business payloads into cache", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    const block = client.slice(
      client.indexOf('source.addEventListener("platform.catch_up"'),
      client.indexOf('source.addEventListener("platform.heartbeat"')
    );
    expect(block).toContain("onCatchUp");
    expect(block).not.toContain("setQueryData");
    expect(block).not.toContain("totalAmount");
  });

  it("KITCHEN-REALTIME-HARDENING-1: heartbeat notes liveness without writing cache", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    const heartbeat = client.slice(
      client.indexOf('source.addEventListener("platform.heartbeat"'),
      client.indexOf("// Listen for known hint event names")
    );
    expect(heartbeat).toContain("noteRealtimeActivity");
    expect(heartbeat).not.toContain("setQueryData");
    expect(client).toContain("handleHeartbeatTimeout");
  });
});
