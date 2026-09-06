/**
 * KITCHEN-REALTIME-HARDENING-1
 * Heartbeat watchdog recovers dead-but-live SSE without making events authoritative.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REALTIME_HEARTBEAT_TIMEOUT_MS,
  REALTIME_HEARTBEAT_WATCHDOG_INTERVAL_MS,
  RealtimePlatformClient,
  __resetRealtimePlatformForTests,
} from "../RealtimePlatformClient";
import {
  getRealtimeClientObservability,
  resetRealtimeClientObservability,
} from "../realtimeClientObservability";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onerror: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  closed = false;
  private readonly listeners = new Map<
    string,
    Set<(ev: MessageEvent) => void>
  >();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, fn: EventListenerOrEventListenerObject): void {
    const handler = fn as (ev: MessageEvent) => void;
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data = "{}"): void {
    for (const fn of this.listeners.get(type) ?? []) {
      fn({ data, lastEventId: "" } as MessageEvent);
    }
  }

  emitReady(): void {
    this.emit("platform.ready");
  }

  emitHeartbeat(): void {
    this.emit("platform.heartbeat");
  }
}

describe("KITCHEN-REALTIME-HARDENING-1 heartbeat watchdog", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    resetRealtimeClientObservability();
    __resetRealtimePlatformForTests();
    vi.useFakeTimers({ now: 1_700_000_000_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    __resetRealtimePlatformForTests();
  });

  it("reconnects when heartbeats go silent while state stays live", async () => {
    const client = new RealtimePlatformClient();
    const states: string[] = [];
    client.connect({
      sseUrl: "/api/realtime/sse?ticket=ok",
      channels: ["kitchen"],
      maxReconnectAttempts: 3,
      handlers: { onStateChange: (state) => states.push(state) },
    });

    MockEventSource.instances[0]?.emitReady();
    expect(client.connectionState).toBe("live");

    await vi.advanceTimersByTimeAsync(REALTIME_HEARTBEAT_TIMEOUT_MS + REALTIME_HEARTBEAT_WATCHDOG_INTERVAL_MS);

    expect(getRealtimeClientObservability().heartbeatTimeouts).toBe(1);
    expect(MockEventSource.instances[0]?.closed).toBe(true);
    expect(states).toContain("reconnecting");

    await vi.advanceTimersByTimeAsync(1_500);
    const latest = MockEventSource.instances.at(-1);
    expect(latest).toBeDefined();
    expect(latest).not.toBe(MockEventSource.instances[0]);
    latest?.emitReady();
    expect(client.connectionState).toBe("live");
  });

  it("does not reconnect while heartbeats continue", async () => {
    const client = new RealtimePlatformClient();
    client.connect({
      sseUrl: "/api/realtime/sse?ticket=ok",
      channels: ["kitchen"],
      maxReconnectAttempts: 3,
    });
    MockEventSource.instances[0]?.emitReady();

    for (let i = 0; i < 6; i += 1) {
      await vi.advanceTimersByTimeAsync(15_000);
      MockEventSource.instances[0]?.emitHeartbeat();
    }

    expect(getRealtimeClientObservability().heartbeatTimeouts).toBe(0);
    expect(client.connectionState).toBe("live");
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it("preserves lastEventId across heartbeat-timeout reconnect", async () => {
    const client = new RealtimePlatformClient();
    client.connect({
      sseUrl: "/api/realtime/sse?ticket=ok",
      channels: ["kitchen"],
      maxReconnectAttempts: 3,
    });
    const first = MockEventSource.instances[0]!;
    first.emitReady();
    first.onmessage?.({
      data: JSON.stringify({
        type: "order.status_changed",
        channel: "kitchen",
        restaurantId: 1,
        aggregateId: "9",
        seq: 1,
        version: "e1",
        ts: new Date().toISOString(),
      }),
      lastEventId: "evt-42",
    } as MessageEvent);

    await vi.advanceTimersByTimeAsync(REALTIME_HEARTBEAT_TIMEOUT_MS + REALTIME_HEARTBEAT_WATCHDOG_INTERVAL_MS);
    await vi.advanceTimersByTimeAsync(1_500);

    const latest = MockEventSource.instances.at(-1);
    expect(latest?.url).toContain("lastEventId=evt-42");
  });

  it("skips watchdog when heartbeat capability is disabled", async () => {
    const client = new RealtimePlatformClient();
    client.connect({
      sseUrl: "/api/realtime/sse?ticket=ok",
      channels: ["kitchen"],
      clientCapabilities: { heartbeat: false },
      maxReconnectAttempts: 3,
    });
    MockEventSource.instances[0]?.emitReady();

    await vi.advanceTimersByTimeAsync(REALTIME_HEARTBEAT_TIMEOUT_MS + REALTIME_HEARTBEAT_WATCHDOG_INTERVAL_MS * 2);

    expect(getRealtimeClientObservability().heartbeatTimeouts).toBe(0);
    expect(client.connectionState).toBe("live");
    expect(MockEventSource.instances).toHaveLength(1);
  });
});
