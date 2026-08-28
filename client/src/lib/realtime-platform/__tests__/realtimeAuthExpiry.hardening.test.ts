/**
 * REALTIME-AUTH-EXPIRY-DEEP-AUDIT-AND-HARDENING-1
 * Expired tickets must be discarded. Reconnect mints a fresh credential.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REALTIME_TICKET_RENEWAL_SKEW_MS,
  RealtimePlatformClient,
  __resetRealtimePlatformForTests,
  realtimeTicketNeedsRefresh,
} from "../RealtimePlatformClient";
import { resetRealtimeClientObservability } from "../realtimeClientObservability";

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

  emitReady(): void {
    for (const fn of this.listeners.get("platform.ready") ?? []) {
      fn({ data: "{}" } as MessageEvent);
    }
  }

  fail(): void {
    this.onerror?.({});
  }
}

describe("REALTIME-AUTH-EXPIRY client credential lifecycle", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    resetRealtimeClientObservability();
    __resetRealtimePlatformForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    __resetRealtimePlatformForTests();
  });

  it("treats ISO expiry as the same instant as Unix-second server exp", () => {
    const expSeconds = 1_700_000_600;
    const iso = new Date(expSeconds * 1000).toISOString();
    expect(
      realtimeTicketNeedsRefresh(iso, expSeconds * 1000 - REALTIME_TICKET_RENEWAL_SKEW_MS - 1)
    ).toBe(false);
    expect(
      realtimeTicketNeedsRefresh(iso, expSeconds * 1000 - REALTIME_TICKET_RENEWAL_SKEW_MS)
    ).toBe(true);
    expect(realtimeTicketNeedsRefresh(iso, expSeconds * 1000 + 1)).toBe(true);
  });

  it("discards an expired ticket, mints a fresh one, and reconnects", async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    const client = new RealtimePlatformClient();
    const refresh = vi.fn(async () => ({
      sseUrl: "/api/realtime/sse?ticket=fresh",
      expiresAt: new Date(1_700_000_000_000 + 600_000).toISOString(),
    }));

    client.connect({
      sseUrl: "/api/realtime/sse?ticket=stale",
      expiresAt: new Date(1_700_000_000_000 - 1_000).toISOString(),
      refreshCredential: refresh,
      channels: ["orders"],
      maxReconnectAttempts: 3,
    });

    expect(MockEventSource.instances[0]?.url).toContain("ticket=stale");
    MockEventSource.instances[0]?.fail();
    await vi.advanceTimersByTimeAsync(1_500);

    expect(refresh).toHaveBeenCalledTimes(1);
    const latest = MockEventSource.instances.at(-1);
    expect(latest?.url).toContain("ticket=fresh");
    expect(latest?.url).not.toContain("ticket=stale");
    latest?.emitReady();
    expect(client.connectionState).toBe("live");
  });

  it("does not reuse a live ticket after expiry window while reconnecting", async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    const client = new RealtimePlatformClient();
    const refresh = vi.fn(async () => ({
      sseUrl: "/api/realtime/sse?ticket=fresh",
      expiresAt: new Date(1_700_000_000_000 + 1_200_000).toISOString(),
    }));

    client.connect({
      sseUrl: "/api/realtime/sse?ticket=ok",
      expiresAt: new Date(1_700_000_000_000 + 600_000).toISOString(),
      refreshCredential: refresh,
      channels: ["orders"],
    });
    MockEventSource.instances[0]?.emitReady();
    expect(client.connectionState).toBe("live");

    MockEventSource.instances[0]?.fail();
    await vi.advanceTimersByTimeAsync(1_500);
    expect(refresh).not.toHaveBeenCalled();
    expect(MockEventSource.instances.at(-1)?.url).toContain("ticket=ok");
  });

  it("falls back instead of looping the same expired ticket when remint is missing", async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    const client = new RealtimePlatformClient();
    const states: string[] = [];

    client.connect({
      sseUrl: "/api/realtime/sse?ticket=stale",
      expiresAt: new Date(1_700_000_000_000 - 1_000).toISOString(),
      channels: ["orders"],
      maxReconnectAttempts: 8,
      handlers: { onStateChange: (state) => states.push(state) },
    });
    MockEventSource.instances[0]?.fail();
    await vi.advanceTimersByTimeAsync(1_500);

    expect(MockEventSource.instances).toHaveLength(1);
    expect(client.connectionState).toBe("poll_only");
    expect(states).toContain("poll_only");
  });

  it("renews before expiry while the connection is live", async () => {
    vi.useFakeTimers({ now: 1_700_000_000_000 });
    const client = new RealtimePlatformClient();
    const refresh = vi.fn(async () => ({
      sseUrl: "/api/realtime/sse?ticket=renewed",
      expiresAt: new Date(1_700_000_000_000 + 1_200_000).toISOString(),
    }));

    client.connect({
      sseUrl: "/api/realtime/sse?ticket=first",
      expiresAt: new Date(1_700_000_000_000 + 90_000).toISOString(),
      refreshCredential: refresh,
      channels: ["orders"],
    });
    MockEventSource.instances[0]?.emitReady();

    await vi.advanceTimersByTimeAsync(30_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(MockEventSource.instances.at(-1)?.url).toContain("ticket=renewed");
  });
});
